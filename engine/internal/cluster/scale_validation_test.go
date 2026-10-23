package cluster

import (
	"context"
	"testing"
)

func TestScaleActionsRejectNegativeReplicas(t *testing.T) {
	replicas := int32(-1)
	manager := &Manager{}

	if err := manager.ScaleDeployment(context.Background(), DeploymentActionParams{Replicas: &replicas}); err == nil {
		t.Error("expected ScaleDeployment to reject negative replicas")
	}
	if err := manager.ScaleReplicaSet(context.Background(), ReplicaSetActionParams{Replicas: &replicas}); err == nil {
		t.Error("expected ScaleReplicaSet to reject negative replicas")
	}
	if err := manager.ScaleStatefulSet(context.Background(), StatefulSetActionParams{Replicas: &replicas}); err == nil {
		t.Error("expected ScaleStatefulSet to reject negative replicas")
	}
}
