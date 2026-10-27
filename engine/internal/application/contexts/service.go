package contexts

import (
	"context"
	"fmt"
	"strings"

	domaincontexts "github.com/kubeview/engine/internal/domain/contexts"
)

type Service struct {
	repository Repository
	observer   SwitchObserver
}

func New(repository Repository, observer SwitchObserver) *Service {
	return &Service{repository: repository, observer: observer}
}

func (service *Service) List(ctx context.Context) (*domaincontexts.ListResult, error) {
	return service.repository.List(ctx)
}

func (service *Service) Switch(
	ctx context.Context,
	contextName string,
) (*domaincontexts.SwitchResult, error) {
	name := strings.TrimSpace(contextName)
	if name == "" {
		return nil, fmt.Errorf("contextName parameter is required")
	}

	result, err := service.repository.Switch(ctx, name)
	if err != nil {
		return nil, err
	}
	if service.observer != nil {
		service.observer.Switched(ctx, name)
	}
	return result, nil
}

func (service *Service) ListNamespaces(
	ctx context.Context,
	contextName string,
) ([]string, error) {
	return service.repository.ListNamespaces(ctx, contextName)
}

func (service *Service) Validate() error {
	if service == nil || service.repository == nil {
		return fmt.Errorf("contexts service repository is not configured")
	}
	return nil
}
