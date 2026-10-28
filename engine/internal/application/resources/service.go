package resources

import (
	"context"
	"fmt"

	domainresources "github.com/kubeview/engine/internal/domain/resources"
)

// Service orchestrates generic resource reads, applies, deletes, and
// capability checks behind transport-independent ports.
type Service struct {
	repository Repository
}

func New(repository Repository) *Service {
	return &Service{repository: repository}
}

func (service *Service) Get(
	ctx context.Context,
	contextName string,
	ref domainresources.Ref,
) (*domainresources.GetResult, error) {
	if err := domainresources.ValidateRef(ref); err != nil {
		return nil, err
	}
	return service.repository.Get(ctx, contextName, ref)
}

func (service *Service) Apply(
	ctx context.Context,
	contextName string,
	request domainresources.ApplyRequest,
) (*domainresources.ApplyResult, error) {
	if err := request.Validate(); err != nil {
		return nil, err
	}
	return service.repository.Apply(ctx, contextName, request)
}

func (service *Service) Delete(
	ctx context.Context,
	contextName string,
	ref domainresources.Ref,
) error {
	if err := domainresources.ValidateRef(ref); err != nil {
		return err
	}
	return service.repository.Delete(ctx, contextName, ref)
}

func (service *Service) Capabilities(
	ctx context.Context,
	contextName string,
	ref domainresources.Ref,
) (*domainresources.Capabilities, error) {
	if err := domainresources.ValidateTarget(ref); err != nil {
		return nil, err
	}
	return service.repository.Capabilities(ctx, contextName, ref)
}

func (service *Service) Validate() error {
	if service == nil || service.repository == nil {
		return fmt.Errorf("resources service repository is not configured")
	}
	return nil
}
