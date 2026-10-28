package permissions

import (
	"context"

	domainpermissions "github.com/kubeview/engine/internal/domain/permissions"
)

type SnapshotReader interface {
	ReadSnapshot(ctx context.Context, contextName string) (*domainpermissions.Snapshot, error)
}

type AccessReviewer interface {
	Review(
		ctx context.Context,
		contextName string,
		subject domainpermissions.Subject,
		operation domainpermissions.Operation,
	) (*domainpermissions.AccessReview, error)
}

// IdentityReader resolves the authenticated identity for a cluster context.
type IdentityReader interface {
	CurrentIdentity(ctx context.Context, contextName string) (domainpermissions.Subject, error)
}
