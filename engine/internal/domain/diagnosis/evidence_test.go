package diagnosis

import (
	"strings"
	"testing"
)

func TestConditionDetail(t *testing.T) {
	tests := []struct {
		name      string
		condition Condition
		want      string
	}{
		{
			name:      "omits an empty detail",
			condition: Condition{Type: "Ready", Status: ConditionTrue},
			want:      "",
		},
		{
			name:      "keeps a reason without a trailing separator",
			condition: Condition{Reason: "ContainersNotReady"},
			want:      "ContainersNotReady",
		},
		{
			name:      "keeps a message without a leading separator",
			condition: Condition{Message: "containers with unready status: [api]"},
			want:      "containers with unready status: [api]",
		},
		{
			name: "joins a reason and message",
			condition: Condition{
				Reason:  "ContainersNotReady",
				Message: "containers with unready status: [api]",
			},
			want: "ContainersNotReady: containers with unready status: [api]",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := conditionDetail(test.condition); got != test.want {
				t.Fatalf("conditionDetail() = %q, want %q", got, test.want)
			}
		})
	}
}

func TestBuildEvidenceConditionDetails(t *testing.T) {
	evidence := buildEvidence(
		PodSnapshot{Conditions: []Condition{
			{Type: "Ready", Status: ConditionTrue},
			{
				Type:    ConditionPodScheduled,
				Status:  "False",
				Reason:  "Unschedulable",
				Message: "0/3 nodes are available: 3 Insufficient memory.",
			},
		}},
		nil,
		nil,
		finding{},
		false,
	)

	if len(evidence) != 2 {
		t.Fatalf("expected 2 evidence items, got %d", len(evidence))
	}
	if len(evidence[0].Details) != 0 {
		t.Errorf("passing condition should have no details, got %q", evidence[0].Details)
	}
	if len(evidence[1].Details) != 1 {
		t.Fatalf("failing condition should have one detail, got %q", evidence[1].Details)
	}
	if strings.TrimSpace(evidence[1].Details[0]) == ":" {
		t.Errorf("condition detail should never be a bare separator")
	}
}
