package cluster

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	policyv1 "k8s.io/api/policy/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/validation"

	shared "github.com/kubeview/engine/internal/domain/shared"
)

// NodeTaintInfo is a transport-safe representation of a node taint.
type NodeTaintInfo struct {
	Key       string `json:"key"`
	Value     string `json:"value,omitempty"`
	Effect    string `json:"effect"`
	TimeAdded string `json:"timeAdded,omitempty"`
}

// NodeInfo is the node detail used by the node operations dialog.
type NodeInfo struct {
	Name          string            `json:"name"`
	Status        string            `json:"status"`
	Roles         []string          `json:"roles"`
	Version       string            `json:"version"`
	InternalIP    string            `json:"internalIP"`
	Unschedulable bool              `json:"unschedulable"`
	Taints        []NodeTaintInfo   `json:"taints"`
	Labels        map[string]string `json:"labels"`
	Age           string            `json:"age"`
	CreatedAt     string            `json:"createdAt"`
}

// NodeActionParams identifies a node for an operational action.
type NodeActionParams struct {
	ContextName string `json:"contextName"`
	NodeName    string `json:"nodeName"`
}

// NodeTaintInput is a desired taint supplied by the client.
type NodeTaintInput struct {
	Key    string `json:"key"`
	Value  string `json:"value,omitempty"`
	Effect string `json:"effect"`
}

// UpdateNodeTaintsParams replaces the node taint set.
type UpdateNodeTaintsParams struct {
	NodeActionParams
	Taints []NodeTaintInput `json:"taints"`
}

// UpdateNodeLabelsParams merges labels and removes the listed keys.
type UpdateNodeLabelsParams struct {
	NodeActionParams
	Labels       map[string]string `json:"labels"`
	RemoveLabels []string          `json:"removeLabels"`
}

// DrainNodeParams controls pod eviction during a drain.
type DrainNodeParams struct {
	NodeActionParams
	Force              bool  `json:"force"`
	DeleteEmptyDirData bool  `json:"deleteEmptyDirData"`
	IgnoreDaemonSets   *bool `json:"ignoreDaemonSets,omitempty"`
	TimeoutSeconds     int   `json:"timeoutSeconds"`
}

// DrainNodeResult reports what happened to every pod considered by a drain.
type DrainNodeResult struct {
	NodeName string   `json:"nodeName"`
	Evicted  []string `json:"evicted"`
	Skipped  []string `json:"skipped"`
	Failed   []string `json:"failed"`
}

func nodeRoles(node *corev1.Node) []string {
	roles := make([]string, 0)
	for key := range node.Labels {
		if strings.HasPrefix(key, "node-role.kubernetes.io/") {
			role := strings.TrimPrefix(key, "node-role.kubernetes.io/")
			if role != "" {
				roles = append(roles, role)
			}
		}
	}
	sort.Strings(roles)
	return roles
}

func nodeReadyStatus(node *corev1.Node) string {
	for _, condition := range node.Status.Conditions {
		if condition.Type == corev1.NodeReady {
			if condition.Status == corev1.ConditionTrue {
				return "Ready"
			}
			return "NotReady"
		}
	}
	return "Unknown"
}

func nodeInternalIP(node *corev1.Node) string {
	for _, address := range node.Status.Addresses {
		if address.Type == corev1.NodeInternalIP {
			return address.Address
		}
	}
	return ""
}

func nodeTaints(node *corev1.Node) []NodeTaintInfo {
	taints := make([]NodeTaintInfo, 0, len(node.Spec.Taints))
	for _, taint := range node.Spec.Taints {
		added := ""
		if taint.TimeAdded != nil {
			added = taint.TimeAdded.UTC().Format(time.RFC3339)
		}
		taints = append(taints, NodeTaintInfo{
			Key:       taint.Key,
			Value:     taint.Value,
			Effect:    string(taint.Effect),
			TimeAdded: added,
		})
	}
	sort.Slice(taints, func(i, j int) bool { return taints[i].Key < taints[j].Key })
	return taints
}

func nodeInfoFromNode(node *corev1.Node) NodeInfo {
	return NodeInfo{
		Name:          node.Name,
		Status:        nodeReadyStatus(node),
		Roles:         nodeRoles(node),
		Version:       node.Status.NodeInfo.KubeletVersion,
		InternalIP:    nodeInternalIP(node),
		Unschedulable: node.Spec.Unschedulable,
		Taints:        nodeTaints(node),
		Labels:        node.Labels,
		Age:           formatAge(time.Since(node.CreationTimestamp.Time)),
		CreatedAt:     node.CreationTimestamp.UTC().Format(time.RFC3339),
	}
}

// ListNodes returns node summaries ordered by name.
func (m *Manager) ListNodes(ctx context.Context, contextName string) ([]NodeInfo, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	list, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}
	items := make([]NodeInfo, 0, len(list.Items))
	for i := range list.Items {
		items = append(items, nodeInfoFromNode(&list.Items[i]))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return items, nil
}

// GetNode returns a single node with taints and labels.
func (m *Manager) GetNode(ctx context.Context, contextName, nodeName string) (*NodeInfo, error) {
	if strings.TrimSpace(nodeName) == "" {
		return nil, shared.Validation("nodeName is required")
	}
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	node, err := client.CoreV1().Nodes().Get(ctx, nodeName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get node %s: %w", nodeName, err)
	}
	info := nodeInfoFromNode(node)
	return &info, nil
}

// CordonNode marks a node unschedulable. Uncordoning uses the same path.
func (m *Manager) CordonNode(ctx context.Context, p NodeActionParams, unschedulable bool) (*NodeInfo, error) {
	if strings.TrimSpace(p.NodeName) == "" {
		return nil, shared.Validation("nodeName is required")
	}
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}
	node, err := client.CoreV1().Nodes().Get(ctx, p.NodeName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get node %s: %w", p.NodeName, err)
	}
	node.Spec.Unschedulable = unschedulable
	updated, err := client.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update node %s: %w", p.NodeName, err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	info := nodeInfoFromNode(updated)
	return &info, nil
}

func validateTaints(taints []NodeTaintInput) error {
	for _, taint := range taints {
		if strings.TrimSpace(taint.Key) == "" {
			return shared.Validation("taint key is required")
		}
		if problems := validation.IsQualifiedName(taint.Key); len(problems) > 0 {
			return shared.Validation(fmt.Sprintf("invalid taint key %q: %s", taint.Key, problems[0]))
		}
		if taint.Value != "" {
			if problems := validation.IsValidLabelValue(taint.Value); len(problems) > 0 {
				return shared.Validation(fmt.Sprintf("invalid taint value %q: %s", taint.Value, problems[0]))
			}
		}
		switch corev1.TaintEffect(taint.Effect) {
		case corev1.TaintEffectNoSchedule, corev1.TaintEffectPreferNoSchedule, corev1.TaintEffectNoExecute:
		default:
			return shared.Validation("taint effect must be NoSchedule, PreferNoSchedule, or NoExecute")
		}
	}
	return nil
}

// ReplaceNodeTaints replaces the full taint set on a node, preserving TimeAdded
// for taints that were already present.
func (m *Manager) ReplaceNodeTaints(ctx context.Context, p UpdateNodeTaintsParams) (*NodeInfo, error) {
	if err := validateTaints(p.Taints); err != nil {
		return nil, err
	}
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}
	node, err := client.CoreV1().Nodes().Get(ctx, p.NodeName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get node %s: %w", p.NodeName, err)
	}
	existing := make(map[string]metav1.Time)
	for _, taint := range node.Spec.Taints {
		if taint.TimeAdded != nil {
			existing[taint.Key+"\x00"+taint.Value+"\x00"+string(taint.Effect)] = *taint.TimeAdded
		}
	}
	now := metav1.NewTime(time.Now().UTC())
	next := make([]corev1.Taint, 0, len(p.Taints))
	for _, taint := range p.Taints {
		entry := corev1.Taint{
			Key:    taint.Key,
			Value:  taint.Value,
			Effect: corev1.TaintEffect(taint.Effect),
		}
		if added, ok := existing[taint.Key+"\x00"+taint.Value+"\x00"+taint.Effect]; ok {
			entry.TimeAdded = &added
		} else {
			entry.TimeAdded = &now
		}
		next = append(next, entry)
	}
	node.Spec.Taints = next
	updated, err := client.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update node taints: %w", err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	info := nodeInfoFromNode(updated)
	return &info, nil
}

// UpdateNodeLabels merges the supplied labels and removes the listed keys.
func (m *Manager) UpdateNodeLabels(ctx context.Context, p UpdateNodeLabelsParams) (*NodeInfo, error) {
	for key, value := range p.Labels {
		if problems := validation.IsQualifiedName(key); len(problems) > 0 {
			return nil, shared.Validation(fmt.Sprintf("invalid label key %q: %s", key, problems[0]))
		}
		if problems := validation.IsValidLabelValue(value); len(problems) > 0 {
			return nil, shared.Validation(fmt.Sprintf("invalid label value %q: %s", value, problems[0]))
		}
	}
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}
	node, err := client.CoreV1().Nodes().Get(ctx, p.NodeName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get node %s: %w", p.NodeName, err)
	}
	if node.Labels == nil {
		node.Labels = map[string]string{}
	}
	for _, key := range p.RemoveLabels {
		delete(node.Labels, key)
	}
	for key, value := range p.Labels {
		node.Labels[key] = value
	}
	updated, err := client.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update node labels: %w", err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	info := nodeInfoFromNode(updated)
	return &info, nil
}

func isDaemonSetPod(pod *corev1.Pod) bool {
	for _, owner := range pod.OwnerReferences {
		if owner.Kind == "DaemonSet" {
			return true
		}
	}
	return false
}

func isMirrorPod(pod *corev1.Pod) bool {
	if pod.Annotations == nil {
		return false
	}
	_, ok := pod.Annotations[corev1.MirrorPodAnnotationKey]
	return ok
}

func hasControllerOwner(pod *corev1.Pod) bool {
	for _, owner := range pod.OwnerReferences {
		if owner.Controller != nil && *owner.Controller {
			return true
		}
	}
	return false
}

func podUsesEmptyDir(pod *corev1.Pod) bool {
	for _, volume := range pod.Spec.Volumes {
		if volume.EmptyDir != nil || volume.Ephemeral != nil {
			return true
		}
	}
	return false
}

// DrainNode cordons a node and evicts eligible pods, honoring pod disruption
// budgets through the Eviction API. Bare pods require Force.
func (m *Manager) DrainNode(ctx context.Context, p DrainNodeParams) (*DrainNodeResult, error) {
	if strings.TrimSpace(p.NodeName) == "" {
		return nil, shared.Validation("nodeName is required")
	}
	timeout := p.TimeoutSeconds
	if timeout <= 0 {
		timeout = 120
	}
	deadline := time.Now().Add(time.Duration(timeout) * time.Second)
	ignoreDaemonSets := true
	if p.IgnoreDaemonSets != nil {
		ignoreDaemonSets = *p.IgnoreDaemonSets
	}

	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}
	node, err := client.CoreV1().Nodes().Get(ctx, p.NodeName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get node %s: %w", p.NodeName, err)
	}
	if !node.Spec.Unschedulable {
		node.Spec.Unschedulable = true
		if _, err := client.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{}); err != nil {
			return nil, fmt.Errorf("failed to cordon node %s: %w", p.NodeName, err)
		}
	}

	pods, err := client.CoreV1().Pods("").List(ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("spec.nodeName=%s", p.NodeName),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods on node %s: %w", p.NodeName, err)
	}

	result := &DrainNodeResult{
		NodeName: p.NodeName,
		Evicted:  []string{},
		Skipped:  []string{},
		Failed:   []string{},
	}
	for i := range pods.Items {
		pod := &pods.Items[i]
		if pod.DeletionTimestamp != nil {
			result.Skipped = append(result.Skipped, pod.Namespace+"/"+pod.Name)
			continue
		}
		if isMirrorPod(pod) {
			result.Skipped = append(result.Skipped, pod.Namespace+"/"+pod.Name+" (mirror pod)")
			continue
		}
		if ignoreDaemonSets && isDaemonSetPod(pod) {
			result.Skipped = append(result.Skipped, pod.Namespace+"/"+pod.Name+" (daemonset)")
			continue
		}
		if !p.Force && !hasControllerOwner(pod) {
			result.Failed = append(result.Failed, pod.Namespace+"/"+pod.Name+" (bare pod; use force)")
			continue
		}
		if !p.DeleteEmptyDirData && podUsesEmptyDir(pod) {
			result.Failed = append(result.Failed, pod.Namespace+"/"+pod.Name+" (uses emptyDir)")
			continue
		}

		evicted := false
		for {
			eviction := &policyv1.Eviction{
				ObjectMeta: metav1.ObjectMeta{
					Name:      pod.Name,
					Namespace: pod.Namespace,
				},
			}
			evictErr := client.PolicyV1().Evictions(pod.Namespace).Evict(ctx, eviction)
			if evictErr == nil || apierrors.IsNotFound(evictErr) {
				evicted = true
				break
			}
			if apierrors.IsTooManyRequests(evictErr) && time.Now().Before(deadline) {
				select {
				case <-ctx.Done():
					return result, ctx.Err()
				case <-time.After(2 * time.Second):
					continue
				}
			}
			result.Failed = append(result.Failed, pod.Namespace+"/"+pod.Name+": "+evictErr.Error())
			break
		}
		if evicted {
			result.Evicted = append(result.Evicted, pod.Namespace+"/"+pod.Name)
		}
	}

	if len(result.Evicted) > 0 {
		pending := make(map[string]struct{}, len(result.Evicted))
		for _, entry := range result.Evicted {
			pending[entry] = struct{}{}
		}
		for len(pending) > 0 && time.Now().Before(deadline) {
			select {
			case <-ctx.Done():
				return result, ctx.Err()
			case <-time.After(2 * time.Second):
			}
			remaining, listErr := client.CoreV1().Pods("").List(ctx, metav1.ListOptions{
				FieldSelector: fmt.Sprintf("spec.nodeName=%s", p.NodeName),
			})
			if listErr != nil {
				for entry := range pending {
					result.Failed = append(result.Failed, entry+": "+listErr.Error())
				}
				pending = nil
				break
			}
			for i := range remaining.Items {
				pod := &remaining.Items[i]
				delete(pending, pod.Namespace+"/"+pod.Name)
			}
		}
		for entry := range pending {
			result.Failed = append(
				result.Failed,
				entry+": timed out waiting for pod termination",
			)
		}
	}

	m.InvalidateOverviewCache(p.ContextName)
	return result, nil
}
