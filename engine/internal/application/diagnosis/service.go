package diagnosis

import (
	"context"
	"fmt"
	"strings"

	domaindiagnosis "github.com/kubeview/engine/internal/domain/diagnosis"
	shared "github.com/kubeview/engine/internal/domain/shared"
)

// Service validates diagnosis requests, gathers evidence through the port,
// and delegates the reasoning to the pure domain analyzer.
type Service struct {
	collector EvidenceCollector
}

func New(collector EvidenceCollector) *Service {
	return &Service{collector: collector}
}

func (service *Service) Diagnose(
	ctx context.Context,
	params Params,
) (*domaindiagnosis.Result, error) {
	namespace := strings.TrimSpace(params.Namespace)
	podName := strings.TrimSpace(params.PodName)
	if namespace == "" || podName == "" {
		return nil, shared.Validation("namespace and podName are required")
	}

	snapshot, err := service.collector.Collect(ctx, Params{
		ContextName: params.ContextName,
		Namespace:   namespace,
		PodName:     podName,
	})
	if err != nil {
		return nil, err
	}
	if snapshot == nil {
		return nil, shared.NewError(
			shared.KindInternal,
			"pod evidence collector returned no snapshot",
			nil,
		)
	}
	return domaindiagnosis.Analyze(snapshot), nil
}

func (service *Service) Validate() error {
	if service == nil || service.collector == nil {
		return fmt.Errorf("diagnosis service collector is not configured")
	}
	return nil
}
