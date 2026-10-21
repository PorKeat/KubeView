package cluster

import (
	"context"
	"testing"
	"time"
)

func TestOverviewCacheAndInvalidation(t *testing.T) {
	mgr := &Manager{
		overviewCache: make(map[string]cachedOverview),
		overviewCalls: make(map[string]*overviewCall),
	}

	mockResult1 := &ClusterOverviewResult{
		ContextName: "cluster-a",
		TotalNodes:  3,
		TotalPods:   25,
	}
	mockResult2 := &ClusterOverviewResult{
		ContextName: "cluster-a",
		Namespace:   "kube-system",
		TotalPods:   10,
	}
	mockResultB := &ClusterOverviewResult{
		ContextName: "cluster-b",
		TotalNodes:  5,
		TotalPods:   50,
	}

	// Prime the cache
	mgr.overviewCache["cluster-a"] = cachedOverview{
		result:   mockResult1,
		cachedAt: time.Now(),
	}
	mgr.overviewCache["cluster-a::kube-system"] = cachedOverview{
		result:   mockResult2,
		cachedAt: time.Now(),
	}
	mgr.overviewCache["cluster-b"] = cachedOverview{
		result:   mockResultB,
		cachedAt: time.Now(),
	}

	// 1. Test fast-path cache hit (within 2.5s TTL)
	ctx := context.Background()
	res, err := mgr.GetClusterOverview(ctx, "cluster-a")
	if err != nil {
		t.Fatalf("Expected cache hit, got error: %v", err)
	}
	if res.TotalNodes != 3 || res.TotalPods != 25 {
		t.Errorf("Unexpected cached result: %+v", res)
	}

	resScoped, err := mgr.GetClusterOverview(ctx, "cluster-a", "kube-system")
	if err != nil {
		t.Fatalf("Expected scoped cache hit, got error: %v", err)
	}
	if resScoped.TotalPods != 10 {
		t.Errorf("Unexpected scoped cached result: %+v", resScoped)
	}

	// 2. Test InvalidateOverviewCache for cluster-a
	mgr.InvalidateOverviewCache("cluster-a")

	mgr.overviewMu.RLock()
	_, hasA := mgr.overviewCache["cluster-a"]
	_, hasAScoped := mgr.overviewCache["cluster-a::kube-system"]
	_, hasB := mgr.overviewCache["cluster-b"]
	mgr.overviewMu.RUnlock()

	if hasA || hasAScoped {
		t.Errorf("Expected cluster-a entries to be purged, found: hasA=%v, hasAScoped=%v", hasA, hasAScoped)
	}
	if !hasB {
		t.Errorf("Expected cluster-b entry to remain untouched")
	}

	// 3. Test InvalidateOverviewCache for all contexts
	mgr.InvalidateOverviewCache("")
	mgr.overviewMu.RLock()
	cacheLen := len(mgr.overviewCache)
	mgr.overviewMu.RUnlock()

	if cacheLen != 0 {
		t.Errorf("Expected empty cache after clearing all, got length: %d", cacheLen)
	}
}
