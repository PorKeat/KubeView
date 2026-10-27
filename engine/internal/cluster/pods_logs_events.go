package cluster

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetPodLogs fetches the log stream for a specific container in a pod
func (m *Manager) GetPodLogs(ctx context.Context, p PodLogsParams) (*PodLogsResult, error) {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}

	selectedContainer := p.Container
	var containerNames []string

	// Fast path: if container is already specified, avoid the extra network round-trip of Pod.Get
	if selectedContainer == "" {
		pod, err := client.CoreV1().Pods(p.Namespace).Get(ctx, p.PodName, metav1.GetOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to get pod %s: %w", p.PodName, err)
		}

		for _, c := range pod.Spec.Containers {
			containerNames = append(containerNames, c.Name)
		}
		for _, c := range pod.Spec.InitContainers {
			containerNames = append(containerNames, c.Name)
		}
		if len(containerNames) > 0 {
			selectedContainer = containerNames[0]
		}
	} else {
		containerNames = []string{selectedContainer}
	}

	opts := &corev1.PodLogOptions{
		Container:  selectedContainer,
		Previous:   p.Previous,
		Timestamps: p.Timestamps,
	}
	if p.SinceSeconds != nil && *p.SinceSeconds > 0 {
		opts.SinceSeconds = p.SinceSeconds
	}
	if p.TailLines > 0 {
		opts.TailLines = &p.TailLines
	} else {
		defaultTail := int64(500)
		opts.TailLines = &defaultTail
	}

	req := client.CoreV1().Pods(p.Namespace).GetLogs(p.PodName, opts)
	stream, err := req.Stream(ctx)
	if err != nil {
		// When previous logs are requested and no previous container exists, return empty logs gracefully without failing RPC
		if p.Previous && (strings.Contains(strings.ToLower(err.Error()), "previous terminated container") || strings.Contains(strings.ToLower(err.Error()), "not found")) {
			return &PodLogsResult{
				Logs:       "",
				Container:  selectedContainer,
				Containers: containerNames,
			}, nil
		}
		return nil, fmt.Errorf("failed to open log stream: %w", err)
	}
	defer stream.Close()

	buf := new(bytes.Buffer)
	_, err = io.Copy(buf, stream)
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("failed to read log stream: %w", err)
	}

	return &PodLogsResult{
		Logs:       buf.String(),
		Container:  selectedContainer,
		Containers: containerNames,
	}, nil
}

// GetPodEvents retrieves recent cluster events involving this pod
func (m *Manager) GetPodEvents(ctx context.Context, contextName, namespace, podName string) (*PodEventsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	fieldSelector := fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Pod", podName)
	events, err := client.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: fieldSelector,
		Limit:         30,
	})
	if err != nil {
		return &PodEventsResult{Events: []PodEventItem{}}, nil
	}

	var items []PodEventItem
	for _, e := range events.Items {
		ts := e.LastTimestamp.Time.Format(time.RFC3339)
		if e.LastTimestamp.IsZero() {
			ts = e.EventTime.Time.Format(time.RFC3339)
		}
		items = append(items, PodEventItem{
			Type:                    e.Type,
			Reason:                  e.Reason,
			Message:                 e.Message,
			Count:                   e.Count,
			LastTimestamp:           ts,
			Source:                  e.Source.Component,
			InvolvedObjectKind:      e.InvolvedObject.Kind,
			InvolvedObjectName:      e.InvolvedObject.Name,
			InvolvedObjectNamespace: e.InvolvedObject.Namespace,
		})
	}

	return &PodEventsResult{Events: items}, nil
}
