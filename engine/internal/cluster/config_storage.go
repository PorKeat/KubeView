package cluster

import (
	"context"
	"encoding/base64"
	"fmt"
	"regexp"
	"sort"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

// ConfigMapSummary is a display-ready ConfigMap row.
type ConfigMapSummary struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Keys              []string          `json:"keys"`
	DataKeyCount      int               `json:"dataKeyCount"`
	BinaryKeyCount    int               `json:"binaryKeyCount"`
	SizeBytes         int64             `json:"sizeBytes"`
	Immutable         bool              `json:"immutable"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

type ListConfigMapsResult struct {
	Items      []ConfigMapSummary `json:"items"`
	TotalCount int                `json:"totalCount"`
}

// ListConfigMaps returns ConfigMap metadata and key information.
func (m *Manager) ListConfigMaps(ctx context.Context, contextName, namespace string) (*ListConfigMapsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}
	list, err := client.CoreV1().ConfigMaps(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list configmaps: %w", err)
	}
	items := make([]ConfigMapSummary, 0, len(list.Items))
	for i := range list.Items {
		items = append(items, convertConfigMap(&list.Items[i]))
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})
	return &ListConfigMapsResult{Items: items, TotalCount: len(items)}, nil
}

func convertConfigMap(configMap *corev1.ConfigMap) ConfigMapSummary {
	keys := make([]string, 0, len(configMap.Data)+len(configMap.BinaryData))
	for key := range configMap.Data {
		keys = append(keys, key)
	}
	for key := range configMap.BinaryData {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return ConfigMapSummary{
		Name:              configMap.Name,
		Namespace:         configMap.Namespace,
		Keys:              keys,
		DataKeyCount:      len(configMap.Data),
		BinaryKeyCount:    len(configMap.BinaryData),
		SizeBytes:         configMapSize(configMap),
		Immutable:         configMap.Immutable != nil && *configMap.Immutable,
		Age:               formatAge(time.Since(configMap.CreationTimestamp.Time)),
		CreationTimestamp: creationTime(configMap.CreationTimestamp),
		Labels:            configMap.Labels,
		Annotations:       configMap.Annotations,
	}
}

func configMapSize(configMap *corev1.ConfigMap) int64 {
	var size int64
	for key, value := range configMap.Data {
		size += int64(len(key) + len(value))
	}
	for key, value := range configMap.BinaryData {
		size += int64(len(key) + len(value))
	}
	return size
}

func creationTime(timestamp metav1.Time) string {
	if timestamp.Time.IsZero() {
		return ""
	}
	return timestamp.Time.Format(time.RFC3339)
}

// GetConfigMapYaml exports a ConfigMap manifest.
func (m *Manager) GetConfigMapYaml(ctx context.Context, contextName, namespace, name string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	configMap, err := client.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get configmap %s: %w", name, err)
	}
	configMap.TypeMeta = metav1.TypeMeta{APIVersion: "v1", Kind: "ConfigMap"}
	configMap.ManagedFields = nil
	data, err := yaml.Marshal(configMap)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal configmap to YAML: %w", err)
	}
	return &PodYamlResult{YAML: string(data)}, nil
}

// ConfigMapEditData is the form payload for editing a ConfigMap.
type ConfigMapEditData struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	ResourceVersion   string            `json:"resourceVersion"`
	Immutable         bool              `json:"immutable"`
	Data              map[string]string `json:"data"`
	BinaryData        map[string]string `json:"binaryData,omitempty"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

type ConfigMapUpdateParams struct {
	ContextName     string            `json:"contextName"`
	Namespace       string            `json:"namespace"`
	Name            string            `json:"name"`
	ResourceVersion string            `json:"resourceVersion"`
	Data            map[string]string `json:"data"`
	BinaryData      map[string]string `json:"binaryData,omitempty"`
}

type ConfigStorageUpdateResult struct {
	ResourceVersion string `json:"resourceVersion"`
}

// GetConfigMapEditData returns ConfigMap data for the form editor.
func (m *Manager) GetConfigMapEditData(ctx context.Context, contextName, namespace, name string) (*ConfigMapEditData, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	configMap, err := client.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get configmap %s: %w", name, err)
	}
	binaryData := make(map[string]string, len(configMap.BinaryData))
	for key, value := range configMap.BinaryData {
		binaryData[key] = base64.StdEncoding.EncodeToString(value)
	}
	return &ConfigMapEditData{
		Name:              configMap.Name,
		Namespace:         configMap.Namespace,
		ResourceVersion:   configMap.ResourceVersion,
		Immutable:         configMap.Immutable != nil && *configMap.Immutable,
		Data:              copyStringMap(configMap.Data),
		BinaryData:        binaryData,
		Age:               formatAge(time.Since(configMap.CreationTimestamp.Time)),
		CreationTimestamp: creationTime(configMap.CreationTimestamp),
		Labels:            configMap.Labels,
		Annotations:       configMap.Annotations,
	}, nil
}

func copyStringMap(source map[string]string) map[string]string {
	copy := make(map[string]string, len(source))
	for key, value := range source {
		copy[key] = value
	}
	return copy
}

func validateConfigStorageKey(key string) error {
	if key == "" {
		return fmt.Errorf("keys cannot be empty")
	}
	if !configStorageKeyPattern.MatchString(key) {
		return fmt.Errorf("key %q must contain only letters, numbers, dots, dashes, and underscores", key)
	}
	return nil
}

var configStorageKeyPattern = regexp.MustCompile(`^[-._a-zA-Z0-9]+$`)

func validateConfigMapUpdate(data map[string]string, binaryData map[string]string) (map[string][]byte, error) {
	binary := make(map[string][]byte, len(binaryData))
	size := 0
	for key, value := range data {
		if err := validateConfigStorageKey(key); err != nil {
			return nil, err
		}
		size += len(key) + len(value)
	}
	for key, encoded := range binaryData {
		if err := validateConfigStorageKey(key); err != nil {
			return nil, err
		}
		decoded, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			return nil, fmt.Errorf("binary data for key %q is not valid base64", key)
		}
		binary[key] = decoded
		size += len(key) + len(decoded)
	}
	if size > 1<<20 {
		return nil, fmt.Errorf("ConfigMap data exceeds the 1 MiB Kubernetes limit")
	}
	return binary, nil
}

// ApplyConfigMap updates a ConfigMap after validation, dry-run, and resourceVersion checks.
func (m *Manager) ApplyConfigMap(ctx context.Context, params ConfigMapUpdateParams) (*ConfigStorageUpdateResult, error) {
	client, _, err := m.GetClientForContext(params.ContextName)
	if err != nil {
		return nil, err
	}
	current, err := client.CoreV1().ConfigMaps(params.Namespace).Get(ctx, params.Name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get configmap %s: %w", params.Name, err)
	}
	if current.Immutable != nil && *current.Immutable {
		return nil, fmt.Errorf("ConfigMap %s is immutable", params.Name)
	}
	if params.ResourceVersion == "" || params.ResourceVersion != current.ResourceVersion {
		return nil, fmt.Errorf("ConfigMap %s was modified by another user; reload and try again", params.Name)
	}
	binaryData, err := validateConfigMapUpdate(params.Data, params.BinaryData)
	if err != nil {
		return nil, err
	}
	updated := current.DeepCopy()
	updated.Data = copyStringMap(params.Data)
	updated.BinaryData = binaryData
	updated.ManagedFields = nil
	if _, err := client.CoreV1().ConfigMaps(params.Namespace).Update(ctx, updated, metav1.UpdateOptions{DryRun: []string{metav1.DryRunAll}, FieldManager: "kubeview"}); err != nil {
		return nil, fmt.Errorf("ConfigMap dry-run failed: %w", err)
	}
	result, err := client.CoreV1().ConfigMaps(params.Namespace).Update(ctx, updated, metav1.UpdateOptions{FieldManager: "kubeview"})
	if err != nil {
		return nil, fmt.Errorf("failed to update configmap %s: %w", params.Name, err)
	}
	return &ConfigStorageUpdateResult{ResourceVersion: result.ResourceVersion}, nil
}
