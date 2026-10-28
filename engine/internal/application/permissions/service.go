package permissions

import (
	"context"
	"fmt"
	"strings"

	domainpermissions "github.com/kubeview/engine/internal/domain/permissions"
	shared "github.com/kubeview/engine/internal/domain/shared"
)

type Service struct {
	snapshots  SnapshotReader
	reviewer   AccessReviewer
	identities IdentityReader
}

func New(snapshots SnapshotReader, reviewer AccessReviewer, identities IdentityReader) *Service {
	return &Service{snapshots: snapshots, reviewer: reviewer, identities: identities}
}

// CurrentIdentity returns the authenticated identity reported by the cluster.
func (service *Service) CurrentIdentity(
	ctx context.Context,
	contextName string,
) (domainpermissions.Subject, error) {
	if service.identities == nil {
		return domainpermissions.Subject{}, shared.NewError(
			shared.KindInternal,
			"permissions service identity reader is not configured",
			nil,
		)
	}
	subject, err := service.identities.CurrentIdentity(ctx, contextName)
	if err != nil {
		return domainpermissions.Subject{}, err
	}
	if strings.TrimSpace(subject.Name) == "" {
		return domainpermissions.Subject{}, shared.NewError(
			shared.KindInternal,
			"cluster returned no identity: authenticated username is empty",
			nil,
		)
	}
	subject.Kind = domainpermissions.SubjectUser
	return subject, nil
}

func (service *Service) Effective(
	ctx context.Context,
	contextName string,
	subject domainpermissions.Subject,
) (*domainpermissions.Effective, error) {
	if err := validateSubject(subject); err != nil {
		return nil, err
	}
	snapshot, err := service.snapshots.ReadSnapshot(ctx, contextName)
	if err != nil {
		return nil, err
	}
	effective := domainpermissions.BuildEffective(subject, *snapshot)
	return &effective, nil
}

func (service *Service) Explain(
	ctx context.Context,
	contextName string,
	subject domainpermissions.Subject,
	operation domainpermissions.Operation,
) (*domainpermissions.Decision, error) {
	if err := validateSubject(subject); err != nil {
		return nil, err
	}
	if strings.TrimSpace(operation.Verb) == "" {
		return nil, shared.Validation("operation verb is required")
	}
	if operation.NonResourceURL == "" && strings.TrimSpace(operation.Resource) == "" {
		return nil, shared.Validation("operation resource or nonResourceURL is required")
	}

	snapshot, err := service.snapshots.ReadSnapshot(ctx, contextName)
	if err != nil {
		return nil, err
	}
	decision := domainpermissions.Explain(subject, operation, *snapshot)
	if service.reviewer == nil {
		decision.Warnings = append(decision.Warnings, "SubjectAccessReview is not configured; the decision is based on local RBAC rules only.")
		return &decision, nil
	}

	review, reviewErr := service.reviewer.Review(ctx, contextName, subject, operation)
	if reviewErr != nil {
		decision.Warnings = append(decision.Warnings,
			fmt.Sprintf("SubjectAccessReview could not be completed: %v", reviewErr))
		return &decision, nil
	}
	decision.SAR = review
	if review != nil && review.Authoritative {
		if review.Allowed && !decision.Allowed {
			decision.Allowed = true
			decision.Reason = "sar_allowed"
			decision.Summary = "The Kubernetes authorizer allowed this operation; local RBAC evidence did not find the granting path."
		} else if !review.Allowed && decision.Allowed {
			decision.Allowed = false
			decision.Reason = "sar_denied"
			decision.Summary = "The Kubernetes authorizer denied this operation despite a locally matching rule. Check admission, authorizers, or group membership."
		} else if !review.Allowed && !decision.Allowed && review.Reason != "" {
			decision.Summary += " Kubernetes reason: " + review.Reason
		}
	}
	return &decision, nil
}

func (service *Service) Validate() error {
	if service == nil || service.snapshots == nil {
		return fmt.Errorf("permissions service snapshot reader is not configured")
	}
	if service.identities == nil {
		return fmt.Errorf("permissions service identity reader is not configured")
	}
	return nil
}

func validateSubject(subject domainpermissions.Subject) error {
	switch subject.Kind {
	case domainpermissions.SubjectServiceAccount, domainpermissions.SubjectUser, domainpermissions.SubjectGroup:
	default:
		return shared.Validation("subject kind must be User, Group, or ServiceAccount")
	}
	if strings.TrimSpace(subject.Name) == "" {
		return shared.Validation("subject name is required")
	}
	if subject.Kind == domainpermissions.SubjectServiceAccount &&
		strings.TrimSpace(subject.Namespace) == "" {
		return shared.Validation("service account namespace is required")
	}
	return nil
}
