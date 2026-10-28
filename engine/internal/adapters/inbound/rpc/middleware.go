package rpc

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/ipc"
)

type Handler func(context.Context, json.RawMessage) (interface{}, *ipc.RPCError)

// Register wraps a feature handler with a request timeout and panic recovery.
// Feature handlers receive a request-scoped context and never construct
// transport-level timeouts themselves.
func Register(
	server *ipc.Server,
	method string,
	timeout time.Duration,
	handler Handler,
) {
	server.Register(method, func(params json.RawMessage) (result interface{}, rpcErr *ipc.RPCError) {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		defer func() {
			if recovered := recover(); recovered != nil {
				server.Log("Recovered panic in RPC %s: %v", method, recovered)
				result = nil
				rpcErr = &ipc.RPCError{
					Code:    ipc.ErrCodeInternalError,
					Message: fmt.Sprintf("Internal error while handling %s", method),
				}
			}
		}()

		return handler(ctx, params)
	})
}
