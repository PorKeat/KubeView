package fleet

import (
	"context"
	"errors"
	"testing"

	domainfleet "github.com/kubeview/engine/internal/domain/fleet"
)

type fakeContexts struct {
	contexts []domainfleet.Context
	err      error
}

func (fake fakeContexts) ListContexts(context.Context) ([]domainfleet.Context, error) {
	return fake.contexts, fake.err
}

type fakeOverviews struct {
	values map[string]*domainfleet.Overview
	errs   map[string]error
}

func (fake fakeOverviews) ReadOverview(_ context.Context, contextName string) (*domainfleet.Overview, error) {
	if err := fake.errs[contextName]; err != nil {
		return nil, err
	}
	return fake.values[contextName], nil
}

func TestServiceReadClassifiesAndAggregates(t *testing.T) {
	contexts := []domainfleet.Context{
		{Name: "prod", Cluster: "prod-cluster", IsCurrent: true},
		{Name: "dev", Cluster: "dev-cluster"},
		{Name: "offline", Cluster: "offline-cluster"},
	}
	service := New(
		fakeContexts{contexts: contexts},
		fakeOverviews{
			values: map[string]*domainfleet.Overview{
				"prod": {
					TotalNodes:              2,
					ReadyNodes:              2,
					TotalPods:               10,
					RunningPods:             10,
					WarningCount:            4,
					DegradedWorkloadsByKind: domainfleet.WorkloadBreakdown{},
				},
				"dev": {
					TotalNodes:              2,
					ReadyNodes:              1,
					TotalPods:               5,
					RunningPods:             3,
					FailedPods:              1,
					DegradedWorkloadsByKind: domainfleet.WorkloadBreakdown{Deployments: 2},
				},
			},
			errs: map[string]error{"offline": errors.New("connection refused")},
		},
	)

	result, err := service.Read(context.Background())
	if err != nil {
		t.Fatalf("Read: %v", err)
	}
	if len(result.Clusters) != 3 {
		t.Fatalf("expected 3 clusters, got %d", len(result.Clusters))
	}
	if result.Clusters[0].Status != domainfleet.StatusHealthy {
		t.Errorf("prod status = %q", result.Clusters[0].Status)
	}
	if result.Clusters[1].Status != domainfleet.StatusDegraded {
		t.Errorf("dev status = %q", result.Clusters[1].Status)
	}
	if result.Clusters[2].Status != domainfleet.StatusOffline {
		t.Errorf("offline status = %q", result.Clusters[2].Status)
	}

	totals := result.Totals
	if totals.Total != 3 || totals.Healthy != 1 || totals.Degraded != 1 || totals.Offline != 1 {
		t.Errorf("unexpected status totals: %+v", totals)
	}
	if totals.TotalNodes != 4 || totals.ReadyNodes != 3 {
		t.Errorf("unexpected node totals: %+v", totals)
	}
	if totals.TotalPods != 15 || totals.RunningPods != 13 || totals.FailedPods != 1 {
		t.Errorf("unexpected pod totals: %+v", totals)
	}
	if totals.DegradedWorkloads != 2 || totals.WarningCount != 4 {
		t.Errorf("unexpected workload/warning totals: %+v", totals)
	}
}

func TestServiceReadPropagatesContextRepositoryFailure(t *testing.T) {
	service := New(fakeContexts{err: errors.New("no kubeconfig")}, fakeOverviews{})
	if _, err := service.Read(context.Background()); err == nil {
		t.Fatal("expected context repository error")
	}
}
