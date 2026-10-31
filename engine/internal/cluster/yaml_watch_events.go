package cluster

import (
	"context"
	"hash/fnv"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// record updates internal version state and returns an event when the
// serialized manifest actually changed. Caller must not hold s.mu.
func (s *yamlWatchSub) record(
	object *unstructured.Unstructured,
	eventName string,
	yamlText string,
) *YAMLWatchEvent {
	hash := yamlFingerprint(yamlText)
	rv := object.GetResourceVersion()

	s.mu.Lock()
	s.lastRV = rv
	s.deleted = false
	s.lastYAML = yamlText
	if s.hasHash && s.lastHash == hash {
		s.mu.Unlock()
		return nil
	}
	s.lastHash = hash
	s.hasHash = true
	s.mu.Unlock()

	return &YAMLWatchEvent{
		Key:             s.key,
		ContextName:     s.target.ContextName,
		Event:           eventName,
		ResourceVersion: rv,
		YAML:            yamlText,
	}
}

func (s *yamlWatchSub) recordDeleted() *YAMLWatchEvent {
	s.mu.Lock()
	s.deleted = true
	s.hasHash = false
	s.lastHash = 0
	rv := s.lastRV
	s.mu.Unlock()

	return &YAMLWatchEvent{
		Key:             s.key,
		ContextName:     s.target.ContextName,
		Event:           "DELETED",
		ResourceVersion: rv,
	}
}

// queue coalesces bursts into a trailing-edge flush. Only the latest manifest
// is sent; intermediate versions are dropped.
func (s *yamlWatchSub) queue(event *YAMLWatchEvent) {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return
	}
	copied := *event
	s.pending = &copied
	if s.flush == nil {
		s.flush = time.AfterFunc(150*time.Millisecond, s.flushPending)
	}
	s.mu.Unlock()
}

func (s *yamlWatchSub) flushPending() {
	s.mu.Lock()
	event := s.pending
	s.pending = nil
	s.flush = nil
	closed := s.closed
	s.mu.Unlock()

	if event != nil && !closed {
		s.hub.emit("yaml.changed", *event)
	}
}

func (s *yamlWatchSub) resourceVersion() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.lastRV
}

func (s *yamlWatchSub) fail(err error) {
	s.mu.Lock()
	s.initErr = err
	s.mu.Unlock()
	close(s.ready)
}

func (s *yamlWatchSub) emitError(err error) {
	code := "WATCH_ERROR"
	switch {
	case apierrors.IsForbidden(err):
		code = "FORBIDDEN"
	case apierrors.IsUnauthorized(err):
		code = "UNAUTHORIZED"
	}
	s.hub.emit("yaml.error", YAMLWatchEvent{
		Key:         s.key,
		ContextName: s.target.ContextName,
		Event:       "ERROR",
		Code:        code,
		Message:     err.Error(),
	})
}

func sleepWithContext(ctx context.Context, delay time.Duration) bool {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}

func nextWatchBackoff(current time.Duration) time.Duration {
	next := current * 2
	if next > 15*time.Second {
		return 15 * time.Second
	}
	return next
}

func yamlFingerprint(text string) uint64 {
	hash := fnv.New64a()
	_, _ = hash.Write([]byte(text))
	return hash.Sum64()
}
