package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

// registerYAMLWatchHandlers exposes live single-object manifest subscriptions.
func registerYAMLWatchHandlers(server *ipc.Server, hub *cluster.YAMLWatchHub) {
	server.Register("resources.watch", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var target cluster.YAMLWatchTarget
		if err := json.Unmarshal(params, &target); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}

		target.ContextName = strings.TrimSpace(target.ContextName)
		target.APIVersion = strings.TrimSpace(target.APIVersion)
		target.Kind = strings.TrimSpace(target.Kind)
		target.Resource = strings.TrimSpace(target.Resource)
		target.Namespace = strings.TrimSpace(target.Namespace)
		target.Name = strings.TrimSpace(target.Name)

		if target.APIVersion == "" || target.Kind == "" || target.Name == "" {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: "apiVersion, kind and name are required",
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		key, snapshot, err := hub.Subscribe(ctx, target)
		if err != nil {
			return nil, watchRPCError(err)
		}

		result := map[string]interface{}{"key": key}
		if snapshot != nil {
			result["event"] = snapshot.Event
			result["resourceVersion"] = snapshot.ResourceVersion
			result["yaml"] = snapshot.YAML
		}
		return result, nil
	})

	server.Register("resources.unwatch", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			Key string `json:"key"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if key := strings.TrimSpace(p.Key); key != "" {
			hub.Unsubscribe(key)
		}
		return map[string]interface{}{"ok": true}, nil
	})
}

func watchRPCError(err error) *ipc.RPCError {
	code := interface{}(ipc.ErrCodeInternalError)
	switch {
	case apierrors.IsForbidden(err):
		code = ipc.ErrK8sForbidden
	case apierrors.IsUnauthorized(err):
		code = ipc.ErrK8sUnauthorized
	case apierrors.IsNotFound(err):
		code = ipc.ErrK8sNotFound
	}
	return &ipc.RPCError{Code: code, Message: err.Error()}
}
