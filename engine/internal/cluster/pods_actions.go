package cluster

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/remotecommand"
)

// DeletePod terminates a pod in the specified namespace
func (m *Manager) DeletePod(ctx context.Context, p DeletePodParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}

	opts := metav1.DeleteOptions{}
	if p.GracePeriodSeconds != nil {
		opts.GracePeriodSeconds = p.GracePeriodSeconds
	}

	if err := client.CoreV1().Pods(p.Namespace).Delete(ctx, p.PodName, opts); err != nil {
		return fmt.Errorf("failed to delete pod %s: %w", p.PodName, err)
	}

	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

// RestartPod triggers restart of a pod by deleting it so its controller recreates it,
// or recreating it if standalone
func (m *Manager) RestartPod(ctx context.Context, p RestartPodParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}

	pod, err := client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to inspect pod %s for restart: %w", p.PodName, err)
	}

	isControlled := len(pod.OwnerReferences) > 0

	// Delete current pod
	if err := client.CoreV1().Pods(p.Namespace).Delete(ctx, p.PodName, metav1.DeleteOptions{}); err != nil {
		return fmt.Errorf("failed to terminate pod %s: %w", p.PodName, err)
	}

	// If standalone, re-create from clean spec
	if !isControlled {
		newPod := &corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:        pod.Name,
				Namespace:   pod.Namespace,
				Labels:      pod.Labels,
				Annotations: pod.Annotations,
			},
			Spec: pod.Spec,
		}
		newPod.Spec.NodeName = "" // Let scheduler re-place it
		_, _ = client.CoreV1().Pods(p.Namespace).Create(ctx, newPod, metav1.CreateOptions{})
	}

	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

func executeInContainer(ctx context.Context, client kubernetes.Interface, execConfig *rest.Config, namespace, podName, containerName string, cmd []string) (*ExecPodResult, error) {
	req := client.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		VersionedParams(&corev1.PodExecOptions{
			Container: containerName,
			Command:   cmd,
			Stdout:    true,
			Stderr:    true,
			TTY:       false,
		}, scheme.ParameterCodec)

	executor, err := remotecommand.NewSPDYExecutor(execConfig, "POST", req.URL())
	if err != nil {
		return nil, fmt.Errorf("failed to create SPDY executor: %w", err)
	}

	var stdoutBuf, stderrBuf bytes.Buffer
	execErr := executor.StreamWithContext(ctx, remotecommand.StreamOptions{
		Stdout: &stdoutBuf,
		Stderr: &stderrBuf,
	})

	exitCode := 0
	if execErr != nil {
		if exitErr, ok := execErr.(interface{ ExitStatus() int }); ok {
			exitCode = exitErr.ExitStatus()
		} else {
			exitCode = 1
		}
		if stderrBuf.Len() == 0 {
			stderrBuf.WriteString(execErr.Error())
		}
	}

	return &ExecPodResult{
		Stdout:   stdoutBuf.String(),
		Stderr:   stderrBuf.String(),
		ExitCode: exitCode,
	}, nil
}

// ExecPod runs a command inside the selected pod container and returns stdout/stderr/exitCode
func (m *Manager) ExecPod(ctx context.Context, p ExecPodParams) (*ExecPodResult, error) {
	client, restConfig, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}

	containerName := p.Container
	var pod *corev1.Pod
	if containerName == "" {
		var getErr error
		pod, getErr = client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
		if getErr != nil {
			return nil, fmt.Errorf("pod %s not found: %w", p.PodName, getErr)
		}
		if len(pod.Spec.Containers) > 0 {
			containerName = pod.Spec.Containers[0].Name
		}
	}

	cmd := p.Command
	if len(cmd) == 0 {
		cmd = []string{"/bin/sh", "-c", "echo 'KubeView shell session active'; uname -a; uptime"}
	}

	execConfig := rest.CopyConfig(restConfig)
	execConfig.Timeout = 0 // Required for SPDY / streaming connections!

	res, err := executeInContainer(ctx, client, execConfig, p.Namespace, p.PodName, containerName, cmd)
	isNoShellErr := (err == nil && res.ExitCode != 0 && (strings.Contains(res.Stderr, "no such file or directory") ||
		strings.Contains(res.Stderr, "not found") ||
		strings.Contains(res.Stderr, "executable file not found") ||
		strings.Contains(res.Stderr, "OCI runtime exec failed")))

	isShellCmd := len(cmd) >= 3 && (cmd[0] == "/bin/sh" || cmd[0] == "sh" ||
		cmd[0] == "/bin/bash" || cmd[0] == "bash" ||
		cmd[0] == "/bin/ash" || cmd[0] == "ash" ||
		cmd[0] == "/bin/zsh" || cmd[0] == "zsh")

	if isNoShellErr && isShellCmd {
		cmdPayload := cmd[2]
		fallbacks := [][]string{
			{"/bin/sh", "-c", cmdPayload},
			{"/bin/bash", "-c", cmdPayload},
			{"bash", "-c", cmdPayload},
			{"/bin/ash", "-c", cmdPayload},
			{"ash", "-c", cmdPayload},
			{"sh", "-c", cmdPayload},
			strings.Fields(cmdPayload), // Direct binary execution for distroless (e.g. "woodpecker-server version")
		}
		for _, fb := range fallbacks {
			if len(fb) == 0 || fb[0] == cmd[0] {
				continue
			}
			fbRes, fbErr := executeInContainer(ctx, client, execConfig, p.Namespace, p.PodName, containerName, fb)
			if fbErr == nil && !strings.Contains(fbRes.Stderr, "no such file or directory") && !strings.Contains(fbRes.Stderr, "not found") && !strings.Contains(fbRes.Stderr, "OCI runtime exec failed") {
				return fbRes, nil
			}
		}

		// If all fallbacks failed, provide clear and actionable distroless container guidance
		if pod == nil {
			pod, _ = client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
		}
		otherContainers := []string{}
		if pod != nil {
			for _, c := range pod.Spec.Containers {
				if c.Name != containerName {
					otherContainers = append(otherContainers, c.Name)
				}
			}
		}
		otherHint := ""
		if len(otherContainers) > 0 {
			otherHint = fmt.Sprintf("• Alternative container(s) in this pod: %s (try selecting from container dropdown above)\n", strings.Join(otherContainers, ", "))
		}

		res.Stderr = fmt.Sprintf(
			"Distroless or minimal container: No shell environment (/bin/sh, /bin/bash, /bin/ash) found in container '%s'.\n\n"+
				"• Container '%s' only includes compiled application binaries without standard shell tools (ls, ps).\n"+
				"%s"+
				"• To run full diagnostic tools, attach an ephemeral debug container:\n"+
				"  kubectl debug -it -n %s %s --image=busybox --target=%s\n",
			containerName, containerName, otherHint, p.Namespace, p.PodName, containerName,
		)
	}

	return res, err
}

// LaunchDebugContainer attaches an ephemeral debug container with full Unix tools to a running pod
func (m *Manager) LaunchDebugContainer(ctx context.Context, p LaunchDebugContainerParams) (*LaunchDebugContainerResult, error) {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}

	pod, err := client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pod %s: %w", p.PodName, err)
	}

	// Check if a debug container targeting this container is already running
	for _, ec := range pod.Status.EphemeralContainerStatuses {
		if ec.State.Running != nil {
			for _, specEC := range pod.Spec.EphemeralContainers {
				if specEC.Name == ec.Name && (specEC.TargetContainerName == p.TargetContainer || p.TargetContainer == "") {
					return &LaunchDebugContainerResult{
						ContainerName: ec.Name,
						Success:       true,
						Message:       fmt.Sprintf("Reusing active debug container '%s'", ec.Name),
					}, nil
				}
			}
		}
	}

	img := p.Image
	if img == "" {
		img = "busybox:stable-musl"
	}

	cleanTarget := strings.ReplaceAll(p.TargetContainer, "_", "-")
	if cleanTarget == "" {
		cleanTarget = "app"
	}
	debugName := fmt.Sprintf("debug-%s-%d", cleanTarget, time.Now().Unix()%10000)
	if len(debugName) > 40 {
		debugName = debugName[:40]
	}

	ephem := corev1.EphemeralContainer{
		TargetContainerName: p.TargetContainer,
		EphemeralContainerCommon: corev1.EphemeralContainerCommon{
			Name:                     debugName,
			Image:                    img,
			Command:                  []string{"sh"},
			Stdin:                    true,
			TTY:                      true,
			TerminationMessagePolicy: corev1.TerminationMessageReadFile,
			ImagePullPolicy:          corev1.PullIfNotPresent,
		},
	}

	pod.Spec.EphemeralContainers = append(pod.Spec.EphemeralContainers, ephem)

	_, err = client.CoreV1().Pods(p.Namespace).UpdateEphemeralContainers(ctx, p.PodName, pod, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to attach ephemeral debug container: %w", err)
	}

	// Wait up to 8 seconds for container to enter Running status
	timeoutCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	ticker := time.NewTicker(400 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-timeoutCtx.Done():
			m.InvalidateOverviewCache(p.ContextName)
			return &LaunchDebugContainerResult{
				ContainerName: debugName,
				Success:       true,
				Message:       fmt.Sprintf("Debug container '%s' created (image pull in progress)", debugName),
			}, nil
		case <-ticker.C:
			current, err := client.CoreV1().Pods(p.Namespace).Get(timeoutCtx, p.PodName, metav1.GetOptions{})
			if err == nil {
				for _, status := range current.Status.EphemeralContainerStatuses {
					if status.Name == debugName {
						if status.State.Running != nil {
							m.InvalidateOverviewCache(p.ContextName)
							return &LaunchDebugContainerResult{
								ContainerName: debugName,
								Success:       true,
								Message:       fmt.Sprintf("Debug container '%s' is ready", debugName),
							}, nil
						} else if status.State.Waiting != nil && status.State.Waiting.Reason == "CrashLoopBackOff" {
							return nil, fmt.Errorf("debug container failed: %s", status.State.Waiting.Message)
						}
					}
				}
			}
		}
	}
}
