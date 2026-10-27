package cluster

import (
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
)

// Helper: convertPodToSummary transforms a client-go Pod into a UI-ready PodSummary
func convertPodToSummary(pod *corev1.Pod) PodSummary {
	var totalContainers int = len(pod.Spec.Containers)
	var readyContainers int = 0
	var totalRestarts int32 = 0
	var containerInfos []ContainerInfo

	specContainerMap := make(map[string]corev1.Container)
	for _, sc := range pod.Spec.Containers {
		specContainerMap[sc.Name] = sc
	}
	for _, sc := range pod.Spec.InitContainers {
		specContainerMap[sc.Name] = sc
	}

	for _, cs := range pod.Status.ContainerStatuses {
		if cs.Ready {
			readyContainers++
		}
		totalRestarts += cs.RestartCount

		stateStr := "Unknown"
		reasonStr := ""
		var waitingReason string
		var waitingMsg string
		if cs.State.Running != nil {
			stateStr = "Running"
		} else if cs.State.Waiting != nil {
			stateStr = "Waiting"
			reasonStr = cs.State.Waiting.Reason
			waitingReason = cs.State.Waiting.Reason
			waitingMsg = cs.State.Waiting.Message
		} else if cs.State.Terminated != nil {
			stateStr = "Terminated"
			reasonStr = cs.State.Terminated.Reason
		}

		var exitCode *int32
		var lastTermReason string
		var lastTermMsg string
		if cs.LastTerminationState.Terminated != nil {
			ec := cs.LastTerminationState.Terminated.ExitCode
			exitCode = &ec
			lastTermReason = cs.LastTerminationState.Terminated.Reason
			lastTermMsg = cs.LastTerminationState.Terminated.Message
		}

		var envList []ContainerEnvVar
		var portsList []ContainerPortInfo
		var volumeMountsList []ContainerVolumeMountInfo
		var resourcesInfo *ContainerResourcesInfo

		if sc, found := specContainerMap[cs.Name]; found {
			for _, env := range sc.Env {
				valFrom := ""
				if env.ValueFrom != nil {
					if env.ValueFrom.SecretKeyRef != nil {
						valFrom = fmt.Sprintf("Secret:%s[%s]", env.ValueFrom.SecretKeyRef.Name, env.ValueFrom.SecretKeyRef.Key)
					} else if env.ValueFrom.ConfigMapKeyRef != nil {
						valFrom = fmt.Sprintf("ConfigMap:%s[%s]", env.ValueFrom.ConfigMapKeyRef.Name, env.ValueFrom.ConfigMapKeyRef.Key)
					} else if env.ValueFrom.FieldRef != nil {
						valFrom = fmt.Sprintf("Field:%s", env.ValueFrom.FieldRef.FieldPath)
					} else {
						valFrom = "DynamicRef"
					}
				}
				envList = append(envList, ContainerEnvVar{
					Name:      env.Name,
					Value:     env.Value,
					ValueFrom: valFrom,
				})
			}

			for _, p := range sc.Ports {
				portsList = append(portsList, ContainerPortInfo{
					Name:          p.Name,
					ContainerPort: p.ContainerPort,
					Protocol:      string(p.Protocol),
				})
			}

			for _, vm := range sc.VolumeMounts {
				volumeMountsList = append(volumeMountsList, ContainerVolumeMountInfo{
					Name:      vm.Name,
					MountPath: vm.MountPath,
					ReadOnly:  vm.ReadOnly,
				})
			}

			var reqItem, limItem *ContainerResourceItem
			if len(sc.Resources.Requests) > 0 {
				reqItem = &ContainerResourceItem{}
				if cpu, ok := sc.Resources.Requests[corev1.ResourceCPU]; ok {
					reqItem.Cpu = cpu.String()
				}
				if mem, ok := sc.Resources.Requests[corev1.ResourceMemory]; ok {
					reqItem.Memory = mem.String()
				}
			}
			if len(sc.Resources.Limits) > 0 {
				limItem = &ContainerResourceItem{}
				if cpu, ok := sc.Resources.Limits[corev1.ResourceCPU]; ok {
					limItem.Cpu = cpu.String()
				}
				if mem, ok := sc.Resources.Limits[corev1.ResourceMemory]; ok {
					limItem.Memory = mem.String()
				}
			}
			if reqItem != nil || limItem != nil {
				resourcesInfo = &ContainerResourcesInfo{
					Requests: reqItem,
					Limits:   limItem,
				}
			}
		}

		containerInfos = append(containerInfos, ContainerInfo{
			Name:                  cs.Name,
			Image:                 cs.Image,
			Ready:                 cs.Ready,
			RestartCount:          cs.RestartCount,
			State:                 stateStr,
			StateReason:           reasonStr,
			ExitCode:              exitCode,
			LastTerminatedReason:  lastTermReason,
			LastTerminatedMessage: lastTermMsg,
			WaitingReason:         waitingReason,
			WaitingMessage:        waitingMsg,
			Env:                   envList,
			Ports:                 portsList,
			VolumeMounts:          volumeMountsList,
			Resources:             resourcesInfo,
		})
	}

	// Include running ephemeral debug containers
	for _, ecs := range pod.Status.EphemeralContainerStatuses {
		stateStr := "Unknown"
		reasonStr := ""
		if ecs.State.Running != nil {
			stateStr = "Running"
		} else if ecs.State.Waiting != nil {
			stateStr = "Waiting"
			reasonStr = ecs.State.Waiting.Reason
		} else if ecs.State.Terminated != nil {
			stateStr = "Terminated"
			reasonStr = ecs.State.Terminated.Reason
		}
		containerInfos = append(containerInfos, ContainerInfo{
			Name:         ecs.Name,
			Image:        ecs.Image,
			Ready:        ecs.Ready,
			RestartCount: ecs.RestartCount,
			State:        stateStr,
			StateReason:  reasonStr,
		})
	}

	// Status resolution (align with kubectl)
	status := string(pod.Status.Phase)
	if pod.DeletionTimestamp != nil {
		status = "Terminating"
	} else {
		// Check for container failures
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.State.Waiting != nil && cs.State.Waiting.Reason != "" {
				status = cs.State.Waiting.Reason
				break
			}
			if cs.State.Terminated != nil && cs.State.Terminated.Reason != "" {
				status = cs.State.Terminated.Reason
				break
			}
		}
	}

	// Calculate CPU & Memory requests
	var cpuMillis int64 = 0
	var memBytes int64 = 0
	var cpuLimitMillis int64 = 0
	var memLimitBytes int64 = 0

	for _, c := range pod.Spec.Containers {
		if req, ok := c.Resources.Requests[corev1.ResourceCPU]; ok {
			cpuMillis += req.MilliValue()
		}
		if req, ok := c.Resources.Requests[corev1.ResourceMemory]; ok {
			memBytes += req.Value()
		}
		if lim, ok := c.Resources.Limits[corev1.ResourceCPU]; ok {
			cpuLimitMillis += lim.MilliValue()
		}
		if lim, ok := c.Resources.Limits[corev1.ResourceMemory]; ok {
			memLimitBytes += lim.Value()
		}
	}

	cpuStr := "-"
	cpuPercent := 0
	if cpuMillis > 0 {
		cpuStr = fmt.Sprintf("%dm", cpuMillis)
		if cpuLimitMillis > 0 {
			cpuPercent = int((cpuMillis * 100) / cpuLimitMillis)
		} else {
			cpuPercent = int(cpuMillis / 20) // proportional scale
		}
		if cpuPercent > 100 {
			cpuPercent = 100
		}
	}

	memStr := "-"
	memPercent := 0
	if memBytes > 0 {
		memStr = formatBytes(memBytes)
		if memLimitBytes > 0 {
			memPercent = int((memBytes * 100) / memLimitBytes)
		} else {
			memPercent = int(memBytes / (1024 * 1024 * 10)) // proportional scale
		}
		if memPercent > 100 {
			memPercent = 100
		}
	}

	age := formatAge(time.Since(pod.CreationTimestamp.Time))

	controlledBy := ""
	if len(pod.OwnerReferences) > 0 {
		controlledBy = fmt.Sprintf("%s/%s", pod.OwnerReferences[0].Kind, pod.OwnerReferences[0].Name)
	}

	// Real Kubernetes Pod Conditions from pod.Status.Conditions
	var conditionItems []PodConditionItem
	for _, c := range pod.Status.Conditions {
		transTime := ""
		if !c.LastTransitionTime.IsZero() {
			transTime = c.LastTransitionTime.Time.Format(time.RFC3339)
		}
		conditionItems = append(conditionItems, PodConditionItem{
			Type:               string(c.Type),
			Status:             string(c.Status),
			LastTransitionTime: transTime,
			Reason:             c.Reason,
			Message:            c.Message,
		})
	}

	qosClass := string(pod.Status.QOSClass)

	return PodSummary{
		Name:              pod.Name,
		Namespace:         pod.Namespace,
		Status:            status,
		Ready:             fmt.Sprintf("%d/%d", readyContainers, totalContainers),
		Restarts:          totalRestarts,
		Age:               age,
		Cpu:               cpuStr,
		CpuPercent:        cpuPercent,
		Memory:            memStr,
		MemoryPercent:     memPercent,
		NodeName:          pod.Spec.NodeName,
		IP:                pod.Status.PodIP,
		Containers:        containerInfos,
		CreationTimestamp: pod.CreationTimestamp.Time.Format(time.RFC3339),
		Labels:            pod.Labels,
		Annotations:       pod.Annotations,
		ControlledBy:      controlledBy,
		QoSClass:          qosClass,
		Conditions:        conditionItems,
	}
}
