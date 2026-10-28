package diagnosis

import (
	"context"
	"errors"
	"testing"

	domaindiagnosis "github.com/kubeview/engine/internal/domain/diagnosis"
	shared "github.com/kubeview/engine/internal/domain/shared"
)

type fakeCollector struct {
	snapshot *domaindiagnosis.Snapshot
	err      error
	calls    int
	received Params
}

func (fake *fakeCollector) Collect(_ context.Context, params Params) (*domaindiagnosis.Snapshot, error) {
	fake.calls++
	fake.received = params
	return fake.snapshot, fake.err
}

func TestDiagnoseRejectsBlankFieldsBeforeCollecting(t *testing.T) {
	collector := &fakeCollector{}
	service := New(collector)

	_, err := service.Diagnose(context.Background(), Params{
		Namespace: " ",
		PodName:   "api",
	})
	if err == nil {
		t.Fatal("expected validation error for blank namespace")
	}
	var domainError *shared.Error
	if !errors.As(err, &domainError) || domainError.Kind != shared.KindInvalid {
		t.Fatalf("expected invalid-kind error, got %v", err)
	}
	if collector.calls != 0 {
		t.Errorf("collector should not be called, got %d calls", collector.calls)
	}
}

func TestDiagnoseTrimsParamsAndAnalyzesEvidence(t *testing.T) {
	collector := &fakeCollector{
		snapshot: &domaindiagnosis.Snapshot{
			ContextName: "prod",
			Pod: domaindiagnosis.PodSnapshot{
				Name:      "api",
				Namespace: "production",
				Phase:     domaindiagnosis.PhaseRunning,
			},
			Containers: []domaindiagnosis.Container{{
				Name:  "api",
				State: "Running",
				Ready: true,
			}},
			Events: []domaindiagnosis.Event{},
		},
	}
	service := New(collector)

	result, err := service.Diagnose(context.Background(), Params{
		ContextName: "prod",
		Namespace:   " production ",
		PodName:     " api ",
	})
	if err != nil {
		t.Fatalf("Diagnose: %v", err)
	}
	if collector.received.Namespace != "production" || collector.received.PodName != "api" {
		t.Errorf("collector received untrimmed params: %+v", collector.received)
	}
	if collector.received.ContextName != "prod" {
		t.Errorf("collector context = %q", collector.received.ContextName)
	}
	if result.IssueType != domaindiagnosis.IssueHealthy || !result.Healthy {
		t.Errorf("unexpected diagnosis: %+v", result)
	}
}

func TestDiagnosePropagatesCollectorFailure(t *testing.T) {
	sentinel := errors.New("connection refused")
	service := New(&fakeCollector{err: sentinel})

	_, err := service.Diagnose(context.Background(), Params{
		Namespace: "production",
		PodName:   "api",
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected collector error, got %v", err)
	}
}

func TestDiagnoseRejectsMissingSnapshot(t *testing.T) {
	service := New(&fakeCollector{})

	_, err := service.Diagnose(context.Background(), Params{
		Namespace: "production",
		PodName:   "api",
	})
	var domainError *shared.Error
	if !errors.As(err, &domainError) || domainError.Kind != shared.KindInternal {
		t.Fatalf("expected internal-kind error, got %v", err)
	}
}
