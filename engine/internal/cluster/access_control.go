package cluster

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/yaml"
)

var customResourceDefinitionGVR = schema.GroupVersionResource{
	Group:    "apiextensions.k8s.io",
	Version:  "v1",
	Resource: "customresourcedefinitions",
}

// ServiceAccountSummary is a display-ready ServiceAccount row.
type ServiceAccountSummary struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	SecretNames       []string          `json:"secretNames"`
	ImagePullSecrets  []string          `json:"imagePullSecretNames"`
	Automount         *bool             `json:"automount,omitempty"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

type ListServiceAccountsResult struct {
	Items      []ServiceAccountSummary `json:"items"`
	TotalCount int                     `json:"totalCount"`
}

// RBACRuleSummary is a display-ready policy rule.
type RBACRuleSummary struct {
	Verbs           []string `json:"verbs"`
	APIGroups       []string `json:"apiGroups"`
	Resources       []string `json:"resources"`
	ResourceNames   []string `json:"resourceNames"`
	NonResourceURLs []string `json:"nonResourceURLs"`
}

type RBACSubjectSummary struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

// RBACResourceSummary is a display-ready Role, ClusterRole, or binding.
type RBACResourceSummary struct {
	Kind              string               `json:"kind"`
	Name              string               `json:"name"`
	Namespace         string               `json:"namespace,omitempty"`
	RoleRef           string               `json:"roleRef,omitempty"`
	Rules             []RBACRuleSummary    `json:"rules"`
	Subjects          []RBACSubjectSummary `json:"subjects"`
	Age               string               `json:"age"`
	CreationTimestamp string               `json:"creationTimestamp"`
	Labels            map[string]string    `json:"labels,omitempty"`
	Annotations       map[string]string    `json:"annotations,omitempty"`
}

type ListRBACResourcesResult struct {
	Items      []RBACResourceSummary `json:"items"`
	TotalCount int                   `json:"totalCount"`
}

type CRDVersionSummary struct {
	Name    string `json:"name"`
	Served  bool   `json:"served"`
	Storage bool   `json:"storage"`
}

// CRDSummary is a display-ready CustomResourceDefinition row.
type CRDSummary struct {
	Name              string              `json:"name"`
	Group             string              `json:"group"`
	Kind              string              `json:"kind"`
	Plural            string              `json:"plural"`
	Scope             string              `json:"scope"`
	Versions          []CRDVersionSummary `json:"versions"`
	Age               string              `json:"age"`
	CreationTimestamp string              `json:"creationTimestamp"`
	Labels            map[string]string   `json:"labels,omitempty"`
	Annotations       map[string]string   `json:"annotations,omitempty"`
}

type ListCRDsResult struct {
	Items      []CRDSummary `json:"items"`
	TotalCount int          `json:"totalCount"`
}

type CustomResourceSummary struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace,omitempty"`
	Status            string            `json:"status,omitempty"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

type ListCustomResourcesResult struct {
	Items      []CustomResourceSummary `json:"items"`
	TotalCount int                     `json:"totalCount"`
}

func (m *Manager) ListServiceAccounts(ctx context.Context, contextName, namespace string) (*ListServiceAccountsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}
	list, err := client.CoreV1().ServiceAccounts(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list service accounts: %w", err)
	}
	items := make([]ServiceAccountSummary, 0, len(list.Items))
	for i := range list.Items {
		account := &list.Items[i]
		secrets := make([]string, 0, len(account.Secrets))
		for _, ref := range account.Secrets {
			secrets = append(secrets, ref.Name)
		}
		imagePullSecrets := make([]string, 0, len(account.ImagePullSecrets))
		for _, ref := range account.ImagePullSecrets {
			imagePullSecrets = append(imagePullSecrets, ref.Name)
		}
		items = append(items, ServiceAccountSummary{
			Name:              account.Name,
			Namespace:         account.Namespace,
			SecretNames:       secrets,
			ImagePullSecrets:  imagePullSecrets,
			Automount:         account.AutomountServiceAccountToken,
			Age:               formatAge(time.Since(account.CreationTimestamp.Time)),
			CreationTimestamp: creationTime(account.CreationTimestamp),
			Labels:            account.Labels,
			Annotations:       account.Annotations,
		})
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})
	return &ListServiceAccountsResult{Items: items, TotalCount: len(items)}, nil
}

func (m *Manager) GetServiceAccountYaml(ctx context.Context, contextName, namespace, name string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	account, err := client.CoreV1().ServiceAccounts(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get service account %s: %w", name, err)
	}
	account.TypeMeta = metav1.TypeMeta{APIVersion: "v1", Kind: "ServiceAccount"}
	account.ManagedFields = nil
	data, err := yaml.Marshal(account)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal service account to YAML: %w", err)
	}
	return &PodYamlResult{YAML: string(data)}, nil
}

func (m *Manager) ListRBACResources(ctx context.Context, contextName, namespace string) (*ListRBACResourcesResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}
	items := make([]RBACResourceSummary, 0)
	results := make(chan []RBACResourceSummary, 4)
	var waitGroup sync.WaitGroup
	waitGroup.Add(4)
	go func() {
		defer waitGroup.Done()
		if roles, listErr := client.RbacV1().Roles(targetNs).List(ctx, metav1.ListOptions{}); listErr == nil {
			converted := make([]RBACResourceSummary, 0, len(roles.Items))
			for i := range roles.Items {
				converted = append(converted, convertRole(&roles.Items[i]))
			}
			results <- converted
		}
	}()
	go func() {
		defer waitGroup.Done()
		if roles, listErr := client.RbacV1().ClusterRoles().List(ctx, metav1.ListOptions{}); listErr == nil {
			converted := make([]RBACResourceSummary, 0, len(roles.Items))
			for i := range roles.Items {
				converted = append(converted, convertClusterRole(&roles.Items[i]))
			}
			results <- converted
		}
	}()
	go func() {
		defer waitGroup.Done()
		if bindings, listErr := client.RbacV1().RoleBindings(targetNs).List(ctx, metav1.ListOptions{}); listErr == nil {
			converted := make([]RBACResourceSummary, 0, len(bindings.Items))
			for i := range bindings.Items {
				converted = append(converted, convertRoleBinding(&bindings.Items[i]))
			}
			results <- converted
		}
	}()
	go func() {
		defer waitGroup.Done()
		if bindings, listErr := client.RbacV1().ClusterRoleBindings().List(ctx, metav1.ListOptions{}); listErr == nil {
			converted := make([]RBACResourceSummary, 0, len(bindings.Items))
			for i := range bindings.Items {
				converted = append(converted, convertClusterRoleBinding(&bindings.Items[i]))
			}
			results <- converted
		}
	}()
	waitGroup.Wait()
	close(results)
	for converted := range results {
		items = append(items, converted...)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Kind != items[j].Kind {
			return items[i].Kind < items[j].Kind
		}
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})
	return &ListRBACResourcesResult{Items: items, TotalCount: len(items)}, nil
}

func nonNilStrings(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}

func convertRBACRules(rules []rbacv1.PolicyRule) []RBACRuleSummary {
	out := make([]RBACRuleSummary, 0, len(rules))
	for _, rule := range rules {
		out = append(out, RBACRuleSummary{
			Verbs:           nonNilStrings(rule.Verbs),
			APIGroups:       nonNilStrings(rule.APIGroups),
			Resources:       nonNilStrings(rule.Resources),
			ResourceNames:   nonNilStrings(rule.ResourceNames),
			NonResourceURLs: nonNilStrings(rule.NonResourceURLs),
		})
	}
	return out
}

func convertRBACSubjects(subjects []rbacv1.Subject) []RBACSubjectSummary {
	out := make([]RBACSubjectSummary, 0, len(subjects))
	for _, subject := range subjects {
		out = append(out, RBACSubjectSummary{
			Kind:      subject.Kind,
			Name:      subject.Name,
			Namespace: subject.Namespace,
		})
	}
	return out
}

func convertRole(role *rbacv1.Role) RBACResourceSummary {
	return RBACResourceSummary{
		Kind:              "Role",
		Name:              role.Name,
		Namespace:         role.Namespace,
		Rules:             convertRBACRules(role.Rules),
		Subjects:          []RBACSubjectSummary{},
		Age:               formatAge(time.Since(role.CreationTimestamp.Time)),
		CreationTimestamp: creationTime(role.CreationTimestamp),
		Labels:            role.Labels,
		Annotations:       role.Annotations,
	}
}

func convertClusterRole(role *rbacv1.ClusterRole) RBACResourceSummary {
	return RBACResourceSummary{
		Kind:              "ClusterRole",
		Name:              role.Name,
		Rules:             convertRBACRules(role.Rules),
		Subjects:          []RBACSubjectSummary{},
		Age:               formatAge(time.Since(role.CreationTimestamp.Time)),
		CreationTimestamp: creationTime(role.CreationTimestamp),
		Labels:            role.Labels,
		Annotations:       role.Annotations,
	}
}

func convertRoleBinding(binding *rbacv1.RoleBinding) RBACResourceSummary {
	return RBACResourceSummary{
		Kind:              "RoleBinding",
		Name:              binding.Name,
		Namespace:         binding.Namespace,
		RoleRef:           binding.RoleRef.Kind + "/" + binding.RoleRef.Name,
		Rules:             []RBACRuleSummary{},
		Subjects:          convertRBACSubjects(binding.Subjects),
		Age:               formatAge(time.Since(binding.CreationTimestamp.Time)),
		CreationTimestamp: creationTime(binding.CreationTimestamp),
		Labels:            binding.Labels,
		Annotations:       binding.Annotations,
	}
}

func convertClusterRoleBinding(binding *rbacv1.ClusterRoleBinding) RBACResourceSummary {
	return RBACResourceSummary{
		Kind:              "ClusterRoleBinding",
		Name:              binding.Name,
		RoleRef:           binding.RoleRef.Kind + "/" + binding.RoleRef.Name,
		Rules:             []RBACRuleSummary{},
		Subjects:          convertRBACSubjects(binding.Subjects),
		Age:               formatAge(time.Since(binding.CreationTimestamp.Time)),
		CreationTimestamp: creationTime(binding.CreationTimestamp),
		Labels:            binding.Labels,
		Annotations:       binding.Annotations,
	}
}

func (m *Manager) GetRBACResourceYaml(ctx context.Context, contextName, kind, namespace, name string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	var object interface{}
	switch kind {
	case "Role":
		role, getErr := client.RbacV1().Roles(namespace).Get(ctx, name, metav1.GetOptions{})
		if getErr != nil {
			return nil, fmt.Errorf("failed to get Role %s: %w", name, getErr)
		}
		role.TypeMeta = metav1.TypeMeta{APIVersion: "rbac.authorization.k8s.io/v1", Kind: "Role"}
		role.ManagedFields = nil
		object = role
	case "ClusterRole":
		role, getErr := client.RbacV1().ClusterRoles().Get(ctx, name, metav1.GetOptions{})
		if getErr != nil {
			return nil, fmt.Errorf("failed to get ClusterRole %s: %w", name, getErr)
		}
		role.TypeMeta = metav1.TypeMeta{APIVersion: "rbac.authorization.k8s.io/v1", Kind: "ClusterRole"}
		role.ManagedFields = nil
		object = role
	case "RoleBinding":
		binding, getErr := client.RbacV1().RoleBindings(namespace).Get(ctx, name, metav1.GetOptions{})
		if getErr != nil {
			return nil, fmt.Errorf("failed to get RoleBinding %s: %w", name, getErr)
		}
		binding.TypeMeta = metav1.TypeMeta{APIVersion: "rbac.authorization.k8s.io/v1", Kind: "RoleBinding"}
		binding.ManagedFields = nil
		object = binding
	case "ClusterRoleBinding":
		binding, getErr := client.RbacV1().ClusterRoleBindings().Get(ctx, name, metav1.GetOptions{})
		if getErr != nil {
			return nil, fmt.Errorf("failed to get ClusterRoleBinding %s: %w", name, getErr)
		}
		binding.TypeMeta = metav1.TypeMeta{APIVersion: "rbac.authorization.k8s.io/v1", Kind: "ClusterRoleBinding"}
		binding.ManagedFields = nil
		object = binding
	default:
		return nil, fmt.Errorf("unsupported RBAC kind %q", kind)
	}
	data, err := yaml.Marshal(object)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal %s to YAML: %w", kind, err)
	}
	return &PodYamlResult{YAML: string(data)}, nil
}

func (m *Manager) ListCRDs(ctx context.Context, contextName string) (*ListCRDsResult, error) {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}
	list, err := client.Resource(customResourceDefinitionGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list custom resource definitions: %w", err)
	}
	items := make([]CRDSummary, 0, len(list.Items))
	for i := range list.Items {
		items = append(items, convertCRD(&list.Items[i]))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &ListCRDsResult{Items: items, TotalCount: len(items)}, nil
}

func convertCRD(crd *unstructured.Unstructured) CRDSummary {
	group, _, _ := unstructured.NestedString(crd.Object, "spec", "group")
	kind, _, _ := unstructured.NestedString(crd.Object, "spec", "names", "kind")
	plural, _, _ := unstructured.NestedString(crd.Object, "spec", "names", "plural")
	scope, _, _ := unstructured.NestedString(crd.Object, "spec", "scope")
	versionObjects, _, _ := unstructured.NestedSlice(crd.Object, "spec", "versions")
	versions := make([]CRDVersionSummary, 0, len(versionObjects))
	for _, versionObject := range versionObjects {
		versionMap, ok := versionObject.(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := versionMap["name"].(string)
		served, _ := versionMap["served"].(bool)
		storage, _ := versionMap["storage"].(bool)
		versions = append(versions, CRDVersionSummary{Name: name, Served: served, Storage: storage})
	}
	return CRDSummary{
		Name:              crd.GetName(),
		Group:             group,
		Kind:              kind,
		Plural:            plural,
		Scope:             scope,
		Versions:          versions,
		Age:               formatAge(time.Since(crd.GetCreationTimestamp().Time)),
		CreationTimestamp: creationTime(crd.GetCreationTimestamp()),
		Labels:            crd.GetLabels(),
		Annotations:       crd.GetAnnotations(),
	}
}

func (m *Manager) GetCRDYaml(ctx context.Context, contextName, name string) (*PodYamlResult, error) {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}
	crd, err := client.Resource(customResourceDefinitionGVR).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get custom resource definition %s: %w", name, err)
	}
	data, err := yaml.Marshal(crd.Object)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal custom resource definition to YAML: %w", err)
	}
	return &PodYamlResult{YAML: string(data)}, nil
}

func (m *Manager) ListCustomResourceInstances(ctx context.Context, contextName, group, version, resource, namespace string) (*ListCustomResourcesResult, error) {
	client, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}
	if group == "" || version == "" || resource == "" {
		return nil, fmt.Errorf("group, version, and resource are required")
	}
	gvr := schema.GroupVersionResource{Group: group, Version: version, Resource: resource}
	var list *unstructured.UnstructuredList
	if namespace != "" && namespace != "all" {
		list, err = client.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
	} else {
		list, err = client.Resource(gvr).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("failed to list custom resources: %w", err)
	}
	items := make([]CustomResourceSummary, 0, len(list.Items))
	for i := range list.Items {
		object := &list.Items[i]
		status, _, _ := unstructured.NestedString(object.Object, "status", "phase")
		if status == "" {
			conditions, _, _ := unstructured.NestedSlice(object.Object, "status", "conditions")
			for _, condition := range conditions {
				conditionMap, ok := condition.(map[string]interface{})
				if !ok {
					continue
				}
				conditionType, _ := conditionMap["type"].(string)
				conditionStatus, _ := conditionMap["status"].(string)
				if conditionType == "Ready" && conditionStatus == "True" {
					status = "Ready"
					break
				}
			}
		}
		items = append(items, CustomResourceSummary{
			Name:              object.GetName(),
			Namespace:         object.GetNamespace(),
			Status:            status,
			Age:               formatAge(time.Since(object.GetCreationTimestamp().Time)),
			CreationTimestamp: creationTime(object.GetCreationTimestamp()),
			Labels:            object.GetLabels(),
			Annotations:       object.GetAnnotations(),
		})
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})
	return &ListCustomResourcesResult{Items: items, TotalCount: len(items)}, nil
}
