package cluster

import (
	"errors"
	"fmt"

	shared "github.com/kubeview/engine/internal/domain/shared"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

// MapActionError normalizes client-go errors from operational actions into
// domain errors so the JSON-RPC boundary can return the right error codes
// (notably K8S_FORBIDDEN for RBAC denials).
func MapActionError(err error, action string) error {
	if err == nil {
		return nil
	}
	var sharedErr *shared.Error
	if errors.As(err, &sharedErr) {
		return err
	}

	message := fmt.Sprintf("Failed to %s", action)
	switch {
	case apierrors.IsNotFound(err):
		return shared.NewError(shared.KindNotFound, message, err)
	case apierrors.IsUnauthorized(err):
		return shared.NewError(shared.KindUnauthorized, message, err)
	case apierrors.IsForbidden(err):
		return shared.NewError(shared.KindForbidden, message, err)
	case apierrors.IsConflict(err), apierrors.IsAlreadyExists(err):
		return shared.NewError(shared.KindConflict, message, err)
	case apierrors.IsTimeout(err), apierrors.IsServerTimeout(err), apierrors.IsTooManyRequests(err):
		return shared.NewError(shared.KindTimeout, message, err)
	case apierrors.IsServiceUnavailable(err), apierrors.IsInternalError(err):
		return shared.NewError(shared.KindUnavailable, message, err)
	}

	var statusErr *apierrors.StatusError
	if errors.As(err, &statusErr) &&
		statusErr.ErrStatus.Code >= 400 &&
		statusErr.ErrStatus.Code < 500 {
		return shared.NewError(shared.KindInvalid, message, err)
	}
	return shared.NewError(shared.KindUnavailable, message, err)
}
