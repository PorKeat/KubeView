package rpc

import (
	"context"
	"errors"

	shared "github.com/kubeview/engine/internal/domain/shared"
	"github.com/kubeview/engine/internal/ipc"
)

func MapError(err error, fallbackCode interface{}, fallbackMessage string) *ipc.RPCError {
	if err == nil {
		return nil
	}
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return &ipc.RPCError{
			Code:    ipc.ErrTimeout,
			Message: fallbackMessage,
		}
	}

	var domainError *shared.Error
	if errors.As(err, &domainError) {
		code := fallbackCode
		switch domainError.Kind {
		case shared.KindInvalid:
			code = ipc.ErrCodeInvalidParams
		case shared.KindNotFound:
			code = ipc.ErrK8sNotFound
		case shared.KindUnauthorized:
			code = ipc.ErrK8sUnauthorized
		case shared.KindForbidden:
			code = ipc.ErrK8sForbidden
		case shared.KindTimeout:
			code = ipc.ErrTimeout
		case shared.KindUnavailable:
			code = ipc.ErrK8sConnFailed
		case shared.KindConflict:
			code = ipc.ErrCodeInvalidRequest
		case shared.KindInternal:
			code = ipc.ErrCodeInternalError
		}
		return &ipc.RPCError{Code: code, Message: err.Error()}
	}

	return &ipc.RPCError{Code: fallbackCode, Message: fallbackMessage}
}
