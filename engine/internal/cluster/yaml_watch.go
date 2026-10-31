package cluster

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/watch"
)

// YAMLWatchTarget identifies a single Kubernetes object to watch.
type YAMLWatchTarget struct {
	ContextName string `json:"contextName"`
	APIVersion  string `json:"apiVersion"`
	Kind        string `json:"kind"`
	Resource    string `json:"resource,omitempty"`
	Namespace   string `json:"namespace,omitempty"`
	Name        string `json:"name"`
}

// Key returns the deterministic subscription key used by clients to route
// push events.
func (t YAMLWatchTarget) Key() string {
	return strings.Join([]string{
		t.ContextName, t.APIVersion, t.Kind, t.Namespace, t.Name,
	}, "|")
}

// YAMLWatchEvent is emitted whenever a watched object changes.
type YAMLWatchEvent struct {
	Key             string `json:"key"`
	ContextName     string `json:"contextName,omitempty"`
	Event           string `json:"event"` // SNAPSHOT, ADDED, MODIFIED, DELETED, ERROR
	ResourceVersion string `json:"resourceVersion,omitempty"`
	YAML            string `json:"yaml,omitempty"`
	Code            string `json:"code,omitempty"`
	Message         string `json:"message,omitempty"`
}

// YAMLWatchHub owns live single-object watches. Subscriptions are refcounted
// by key so multiple UI surfaces share one upstream watch.
type YAMLWatchHub struct {
	mgr    *Manager
	emit   func(method string, payload interface{})
	logger *log.Logger

	mu     sync.Mutex
	subs   map[string]*yamlWatchSub
	closed bool
}

func NewYAMLWatchHub(mgr *Manager, emit func(method string, payload interface{})) *YAMLWatchHub {
	return &YAMLWatchHub{
		mgr:    mgr,
		emit:   emit,
		logger: log.New(os.Stderr, "[yaml-watch] ", log.LstdFlags|log.Lmicroseconds),
		subs:   make(map[string]*yamlWatchSub),
	}
}

// Subscribe starts (or joins) a live watch and returns the current snapshot.
// The snapshot is also pushed as a `yaml.changed` notification, so clients
// that subscribe before the RPC resolves still receive it.
func (h *YAMLWatchHub) Subscribe(
	ctx context.Context,
	target YAMLWatchTarget,
) (string, *YAMLWatchEvent, error) {
	if h == nil || h.mgr == nil {
		return "", nil, fmt.Errorf("live YAML watch is unavailable")
	}
	if strings.TrimSpace(target.Name) == "" || strings.TrimSpace(target.APIVersion) == "" ||
		strings.TrimSpace(target.Kind) == "" {
		return "", nil, fmt.Errorf("name, apiVersion and kind are required")
	}

	key := target.Key()

	h.mu.Lock()
	if h.closed {
		h.mu.Unlock()
		return "", nil, fmt.Errorf("engine is shutting down")
	}
	if existing, ok := h.subs[key]; ok {
		existing.refs++
		h.mu.Unlock()
		return existing.wait(ctx)
	}

	subCtx, cancel := context.WithCancel(context.Background())
	sub := &yamlWatchSub{
		hub:    h,
		key:    key,
		target: target,
		cancel: cancel,
		refs:   1,
		ready:  make(chan struct{}),
	}
	h.subs[key] = sub
	h.mu.Unlock()

	go sub.run(subCtx)
	return sub.wait(ctx)
}

// Unsubscribe releases one consumer of a subscription.
func (h *YAMLWatchHub) Unsubscribe(key string) {
	if h == nil {
		return
	}
	h.mu.Lock()
	sub, ok := h.subs[key]
	remove := false
	if ok {
		sub.refs--
		remove = sub.refs <= 0
		if remove {
			delete(h.subs, key)
		}
	}
	h.mu.Unlock()
	if remove {
		sub.cancel()
	}
}

// CancelAll stops every live watch, e.g. after a context switch.
func (h *YAMLWatchHub) CancelAll() {
	if h == nil {
		return
	}
	h.mu.Lock()
	subs := make([]*yamlWatchSub, 0, len(h.subs))
	for key, sub := range h.subs {
		subs = append(subs, sub)
		delete(h.subs, key)
	}
	h.mu.Unlock()
	for _, sub := range subs {
		sub.cancel()
	}
}

// Close stops the hub and every subscription.
func (h *YAMLWatchHub) Close() {
	if h == nil {
		return
	}
	h.mu.Lock()
	h.closed = true
	h.mu.Unlock()
	h.CancelAll()
}

type yamlWatchSub struct {
	hub    *YAMLWatchHub
	key    string
	target YAMLWatchTarget
	cancel context.CancelFunc
	refs   int

	ready   chan struct{}
	initErr error

	mu       sync.Mutex
	lastRV   string
	lastYAML string
	lastHash uint64
	hasHash  bool
	deleted  bool
	pending  *YAMLWatchEvent
	flush    *time.Timer
	closed   bool
}

func (s *yamlWatchSub) wait(ctx context.Context) (string, *YAMLWatchEvent, error) {
	timer := time.NewTimer(15 * time.Second)
	defer timer.Stop()

	select {
	case <-s.ready:
	case <-ctx.Done():
		s.release()
		return "", nil, ctx.Err()
	case <-timer.C:
		s.release()
		return "", nil, fmt.Errorf("timed out preparing live watch for %s", s.target.Name)
	}

	s.mu.Lock()
	initErr := s.initErr
	snapshot := s.currentEventLocked()
	s.mu.Unlock()

	if initErr != nil {
		s.release()
		return "", nil, initErr
	}
	if snapshot == nil {
		s.release()
		return "", nil, fmt.Errorf("live watch did not produce a snapshot")
	}
	return s.key, snapshot, nil
}

// currentEventLocked builds the latest snapshot for new subscribers.
// Caller must hold s.mu.
func (s *yamlWatchSub) currentEventLocked() *YAMLWatchEvent {
	if s.initErr != nil {
		return nil
	}
	event := &YAMLWatchEvent{
		Key:             s.key,
		ContextName:     s.target.ContextName,
		Event:           "SNAPSHOT",
		ResourceVersion: s.lastRV,
	}
	if s.deleted {
		event.Event = "DELETED"
		return event
	}
	if s.lastYAML == "" {
		return nil
	}
	event.YAML = s.lastYAML
	return event
}

func (s *yamlWatchSub) release() {
	h := s.hub
	h.mu.Lock()
	remove := false
	if current, ok := h.subs[s.key]; ok && current == s {
		s.refs--
		remove = s.refs <= 0
		if remove {
			delete(h.subs, s.key)
		}
	}
	h.mu.Unlock()
	if remove {
		s.cancel()
	}
}

func (s *yamlWatchSub) cleanup() {
	s.mu.Lock()
	s.closed = true
	if s.flush != nil {
		s.flush.Stop()
		s.flush = nil
	}
	s.pending = nil
	s.mu.Unlock()

	h := s.hub
	h.mu.Lock()
	if h.subs[s.key] == s {
		delete(h.subs, s.key)
	}
	h.mu.Unlock()
}

func (s *yamlWatchSub) run(ctx context.Context) {
	defer s.cleanup()

	target, err := s.hub.mgr.ResolveGenericResource(
		ctx,
		s.target.ContextName,
		s.target.APIVersion,
		s.target.Kind,
		s.target.Resource,
		s.target.Namespace,
	)
	if err != nil {
		s.fail(err)
		return
	}

	dynamicClient, err := s.hub.mgr.getDynamicClient(s.target.ContextName)
	if err != nil {
		s.fail(err)
		return
	}

	resource := genericResourceInterface(
		dynamicClient, target.GVR, s.target.Namespace, target.Namespaced,
	)

	s.hub.logger.Printf(
		"Starting live YAML watch for %s %s/%s (context %s)",
		s.target.Kind, s.target.Namespace, s.target.Name, s.target.ContextName,
	)
	defer s.hub.logger.Printf(
		"Stopped live YAML watch for %s %s/%s",
		s.target.Kind, s.target.Namespace, s.target.Name,
	)

	initialized := false
	backoff := time.Second

	for {
		if ctx.Err() != nil {
			return
		}

		// A GET on every (re)connect resyncs the manifest and gives us the
		// resourceVersion to resume the watch from. This also recovers from
		// expired resourceVersions without special-casing 410 responses.
		object, getErr := resource.Get(ctx, s.target.Name, metav1.GetOptions{})
		if getErr != nil {
			if !initialized {
				s.fail(getErr)
				return
			}
			if apierrors.IsForbidden(getErr) || apierrors.IsUnauthorized(getErr) {
				s.emitError(getErr)
				return
			}
			if !sleepWithContext(ctx, backoff) {
				return
			}
			backoff = nextWatchBackoff(backoff)
			continue
		}

		yamlText, marshalErr := marshalWatchYAML(object, s.target.Kind)
		if marshalErr != nil {
			if !initialized {
				s.fail(marshalErr)
				return
			}
			s.hub.logger.Printf("Failed to serialize watched object: %v", marshalErr)
			return
		}

		event := s.record(object, "SNAPSHOT", yamlText)
		if !initialized {
			initialized = true
			s.mu.Lock()
			s.initErr = nil
			s.mu.Unlock()
			// Emit before signaling readiness so the notification is written
			// to the client before the subscribe RPC resolves.
			if event != nil {
				s.hub.emit("yaml.changed", *event)
			}
			close(s.ready)
		} else if event != nil {
			s.queue(event)
		}

		timeoutSeconds := int64(300)
		w, watchErr := resource.Watch(ctx, metav1.ListOptions{
			FieldSelector:       "metadata.name=" + s.target.Name,
			ResourceVersion:     s.resourceVersion(),
			AllowWatchBookmarks: true,
			TimeoutSeconds:      &timeoutSeconds,
		})
		if watchErr != nil {
			if apierrors.IsForbidden(watchErr) || apierrors.IsUnauthorized(watchErr) {
				s.emitError(watchErr)
				return
			}
			if !sleepWithContext(ctx, backoff) {
				return
			}
			backoff = nextWatchBackoff(backoff)
			continue
		}

		backoff = time.Second
		s.consume(ctx, w)
		w.Stop()

		if ctx.Err() != nil {
			return
		}
	}
}

func (s *yamlWatchSub) consume(ctx context.Context, w watch.Interface) {
	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-w.ResultChan():
			if !ok {
				return
			}

			switch event.Type {
			case watch.Bookmark:
				if object, ok := event.Object.(*unstructured.Unstructured); ok {
					s.mu.Lock()
					s.lastRV = object.GetResourceVersion()
					s.mu.Unlock()
				}
			case watch.Added, watch.Modified:
				object, ok := event.Object.(*unstructured.Unstructured)
				if !ok || object.GetName() != s.target.Name {
					continue
				}
				// Skip duplicate events for the version we already have.
				if rv := object.GetResourceVersion(); rv != "" && rv == s.resourceVersion() {
					continue
				}
				yamlText, err := marshalWatchYAML(object, s.target.Kind)
				if err != nil {
					s.hub.logger.Printf("Failed to serialize watch event: %v", err)
					continue
				}
				if update := s.record(object, string(event.Type), yamlText); update != nil {
					s.queue(update)
				}
			case watch.Deleted:
				if object, ok := event.Object.(*unstructured.Unstructured); ok &&
					object.GetName() != s.target.Name {
					continue
				}
				s.queue(s.recordDeleted())
			case watch.Error:
				// The watch stream reported an error (frequently an expired
				// resourceVersion). Close the stream; the outer loop re-GETs
				// and restarts from a fresh resourceVersion.
				return
			}
		}
	}
}
