package cluster

import (
	"context"
	"log"
	"os"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
)

type PodChangeEvent struct {
	Type    string     `json:"type"` // "ADDED", "MODIFIED", "DELETED"
	Context string     `json:"context,omitempty"`
	Pod     PodSummary `json:"pod"`
}

// ResourceWatcher continuously streams live changes from Kubernetes without polling
type ResourceWatcher struct {
	mu         sync.Mutex
	mgr        *Manager
	logger     *log.Logger
	cancelFn   context.CancelFunc
	activeCtx  string
	onPod      func(event PodChangeEvent)
	onEvent    func(event PodEventItem)
	onOverview func(contextName string)
}

func NewResourceWatcher(
	mgr *Manager,
	onPod func(event PodChangeEvent),
	onEvent func(event PodEventItem),
	onOverview func(contextName string),
) *ResourceWatcher {
	return &ResourceWatcher{
		mgr:        mgr,
		logger:     log.New(os.Stderr, "[resource-watcher] ", log.LstdFlags|log.Lmicroseconds),
		onPod:      onPod,
		onEvent:    onEvent,
		onOverview: onOverview,
	}
}

// SwitchContext cancels previous watchers and starts live watching for the new context
func (rw *ResourceWatcher) SwitchContext(ctx context.Context, contextName string) {
	rw.mu.Lock()
	defer rw.mu.Unlock()

	if rw.cancelFn != nil {
		rw.cancelFn()
		rw.cancelFn = nil
	}

	rw.activeCtx = contextName
	if contextName == "" {
		return
	}

	rw.mgr.InvalidateOverviewCache(contextName)

	watchCtx, cancel := context.WithCancel(context.Background())
	rw.cancelFn = cancel

	go rw.runPodWatch(watchCtx, contextName)
	go rw.runEventWatch(watchCtx, contextName)
}

func (rw *ResourceWatcher) Stop() {
	rw.mu.Lock()
	defer rw.mu.Unlock()

	if rw.cancelFn != nil {
		rw.cancelFn()
		rw.cancelFn = nil
	}
}

func (rw *ResourceWatcher) runPodWatch(ctx context.Context, contextName string) {
	rw.logger.Printf("Starting live Pod watch stream for context '%s'...", contextName)

	var overviewTimer *time.Timer
	var timerMu sync.Mutex

	triggerOverviewDebounced := func() {
		timerMu.Lock()
		defer timerMu.Unlock()
		if overviewTimer != nil {
			overviewTimer.Stop()
		}
		overviewTimer = time.AfterFunc(400*time.Millisecond, func() {
			rw.mgr.InvalidateOverviewCache(contextName)
			if rw.onOverview != nil {
				rw.onOverview(contextName)
			}
		})
	}

	backoff := 1 * time.Second
	for {
		select {
		case <-ctx.Done():
			rw.logger.Printf("Pod watch stream stopped for context '%s'", contextName)
			return
		default:
		}

		client, _, err := rw.mgr.GetClientForContext(contextName)
		if err != nil {
			time.Sleep(backoff)
			continue
		}

		// Watch all pods across all namespaces
		w, err := client.CoreV1().Pods("").Watch(ctx, metav1.ListOptions{})
		if err != nil {
			rw.logger.Printf("Failed to open Pod watch stream: %v (retrying in %v)", err, backoff)
			time.Sleep(backoff)
			if backoff < 15*time.Second {
				backoff *= 2
			}
			continue
		}

		backoff = 1 * time.Second
		rw.logger.Printf("Pod watch stream established for context '%s'", contextName)

		resultCh := w.ResultChan()
		for {
			event, ok := <-resultCh
			if !ok {
				rw.logger.Printf("Pod watch channel closed by server, reconnecting...")
				break
			}

			if event.Type == watch.Error {
				rw.logger.Printf("Pod watch error event received, restarting stream")
				break
			}

			pod, isPod := event.Object.(*corev1.Pod)
			if !isPod || pod == nil {
				continue
			}

			summary := convertPodToSummary(pod)
			if rw.onPod != nil {
				rw.onPod(PodChangeEvent{
					Type:    string(event.Type),
					Context: contextName,
					Pod:     summary,
				})
			}

			// Pod changes also affect cluster totals, CPU/memory, and workload counts
			triggerOverviewDebounced()
		}
	}
}

func (rw *ResourceWatcher) runEventWatch(ctx context.Context, contextName string) {
	rw.logger.Printf("Starting live Warning Events watch stream for context '%s'...", contextName)

	backoff := 1 * time.Second
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		client, _, err := rw.mgr.GetClientForContext(contextName)
		if err != nil {
			time.Sleep(backoff)
			continue
		}

		w, err := client.CoreV1().Events("").Watch(ctx, metav1.ListOptions{})
		if err != nil {
			time.Sleep(backoff)
			if backoff < 15*time.Second {
				backoff *= 2
			}
			continue
		}

		backoff = 1 * time.Second
		resultCh := w.ResultChan()
		for {
			ev, ok := <-resultCh
			if !ok {
				break
			}

			k8sEv, isEv := ev.Object.(*corev1.Event)
			if !isEv || k8sEv == nil {
				continue
			}

			if k8sEv.Type == corev1.EventTypeWarning && rw.onEvent != nil {
				ts := k8sEv.LastTimestamp.Time.Format(time.RFC3339)
				if k8sEv.LastTimestamp.IsZero() {
					ts = k8sEv.EventTime.Time.Format(time.RFC3339)
				}
				rw.onEvent(PodEventItem{
					Context:                 contextName,
					Type:                    k8sEv.Type,
					Reason:                  k8sEv.Reason,
					Message:                 k8sEv.Message,
					Count:                   k8sEv.Count,
					LastTimestamp:           ts,
					Source:                  k8sEv.Source.Component,
					InvolvedObjectKind:      k8sEv.InvolvedObject.Kind,
					InvolvedObjectName:      k8sEv.InvolvedObject.Name,
					InvolvedObjectNamespace: k8sEv.InvolvedObject.Namespace,
				})
			}
		}
	}
}
