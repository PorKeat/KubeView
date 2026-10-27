package cluster

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"
)

// SecretSummary is a display-ready Secret row without secret values.
type SecretSummary struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Type              string            `json:"type"`
	Keys              []string          `json:"keys"`
	DataKeyCount      int               `json:"dataKeyCount"`
	SizeBytes         int64             `json:"sizeBytes"`
	Immutable         bool              `json:"immutable"`
	MetadataOnly      bool              `json:"metadataOnly,omitempty"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

type ListSecretsResult struct {
	Items      []SecretSummary `json:"items"`
	TotalCount int             `json:"totalCount"`
}

// ListSecrets returns Secret metadata and key counts without values.
func (m *Manager) ListSecrets(ctx context.Context, contextName, namespace string) (*ListSecretsResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}
	// Fetch the Table representation first. It contains name, namespace, type,
	// key count, and age without transferring Secret payloads. This is critical
	// for clusters with large Helm release or TLS Secrets.
	if items, tableErr := m.listSecretsFromTable(ctx, client, targetNs); tableErr == nil {
		sort.Slice(items, func(i, j int) bool {
			if items[i].Namespace == items[j].Namespace {
				return items[i].Name < items[j].Name
			}
			return items[i].Namespace < items[j].Namespace
		})
		return &ListSecretsResult{Items: items, TotalCount: len(items)}, nil
	}

	// Fallback for API implementations that do not expose the table endpoint.
	list, err := client.CoreV1().Secrets(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list secrets: %w", err)
	}
	items := make([]SecretSummary, 0, len(list.Items))
	for i := range list.Items {
		items = append(items, convertSecret(&list.Items[i]))
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})
	return &ListSecretsResult{Items: items, TotalCount: len(items)}, nil
}

func (m *Manager) listSecretsFromTable(ctx context.Context, client kubernetes.Interface, namespace string) (items []SecretSummary, err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			items = nil
			err = fmt.Errorf("table API is unavailable: %v", recovered)
		}
	}()
	restClient := client.CoreV1().RESTClient()
	if restClient == nil {
		return nil, fmt.Errorf("table API is unavailable")
	}
	request := restClient.Get().
		Resource("secrets").
		SetHeader("Accept", "application/json;as=Table;v=v1;g=meta.k8s.io").
		Param("includeObject", "Metadata")
	if namespace != "" {
		request = request.Namespace(namespace)
	}
	raw, err := request.Do(ctx).Raw()
	if err != nil {
		return nil, err
	}
	var table metav1.Table
	if err := json.Unmarshal(raw, &table); err != nil {
		return nil, err
	}
	columns := make(map[string]int, len(table.ColumnDefinitions))
	for index, column := range table.ColumnDefinitions {
		columns[strings.ToLower(column.Name)] = index
	}
	cell := func(row metav1.TableRow, name string) string {
		index, ok := columns[strings.ToLower(name)]
		if !ok || index >= len(row.Cells) {
			return ""
		}
		return fmt.Sprint(row.Cells[index])
	}
	items = make([]SecretSummary, 0, len(table.Rows))
	for _, row := range table.Rows {
		name := cell(row, "name")
		if name == "" {
			continue
		}
		namespaceValue := cell(row, "namespace")
		if namespaceValue == "" && len(row.Object.Raw) > 0 {
			var metadata metav1.PartialObjectMetadata
			if json.Unmarshal(row.Object.Raw, &metadata) == nil {
				namespaceValue = metadata.Namespace
			}
		}
		if namespaceValue == "" {
			namespaceValue = namespace
		}
		keyCount, _ := strconv.Atoi(strings.TrimSpace(cell(row, "data")))
		items = append(items, SecretSummary{
			Name:         name,
			Namespace:    namespaceValue,
			Type:         cell(row, "type"),
			Keys:         []string{},
			DataKeyCount: keyCount,
			SizeBytes:    -1,
			Immutable:    false,
			MetadataOnly: true,
			Age:          cell(row, "age"),
		})
	}
	return items, nil
}

func convertSecret(secret *corev1.Secret) SecretSummary {
	keys := make([]string, 0, len(secret.Data))
	var size int64
	for key, value := range secret.Data {
		keys = append(keys, key)
		size += int64(len(key) + len(value))
	}
	sort.Strings(keys)
	return SecretSummary{
		Name:              secret.Name,
		Namespace:         secret.Namespace,
		Type:              string(secret.Type),
		Keys:              keys,
		DataKeyCount:      len(secret.Data),
		SizeBytes:         size,
		Immutable:         secret.Immutable != nil && *secret.Immutable,
		Age:               formatAge(time.Since(secret.CreationTimestamp.Time)),
		CreationTimestamp: creationTime(secret.CreationTimestamp),
		Labels:            secret.Labels,
		Annotations:       secret.Annotations,
	}
}

// GetSecretYaml exports Secret metadata with all values redacted.
func (m *Manager) GetSecretYaml(ctx context.Context, contextName, namespace, name string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	secret, err := client.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get secret %s: %w", name, err)
	}
	redactedData := make(map[string]string, len(secret.Data))
	for key := range secret.Data {
		redactedData[key] = "<redacted>"
	}
	metadata := map[string]interface{}{
		"name":      secret.Name,
		"namespace": secret.Namespace,
	}
	if len(secret.Labels) > 0 {
		metadata["labels"] = secret.Labels
	}
	if len(secret.Annotations) > 0 {
		metadata["annotations"] = secret.Annotations
	}
	object := map[string]interface{}{
		"apiVersion": "v1",
		"kind":       "Secret",
		"metadata":   metadata,
		"type":       string(secret.Type),
	}
	if len(redactedData) > 0 {
		object["data"] = redactedData
	}
	if secret.Immutable != nil {
		object["immutable"] = *secret.Immutable
	}
	data, err := yaml.Marshal(object)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal secret to YAML: %w", err)
	}
	return &PodYamlResult{YAML: string(data)}, nil
}

type SecretEditEntry struct {
	Key    string `json:"key"`
	Value  string `json:"value"`
	Binary bool   `json:"binary"`
}

// SecretEditData is returned only after an explicit reveal request.
type SecretEditData struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	ResourceVersion   string            `json:"resourceVersion"`
	Immutable         bool              `json:"immutable"`
	Type              string            `json:"type"`
	Entries           []SecretEditEntry `json:"entries"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

type SecretUpdateParams struct {
	ContextName     string            `json:"contextName"`
	Namespace       string            `json:"namespace"`
	Name            string            `json:"name"`
	ResourceVersion string            `json:"resourceVersion"`
	Entries         []SecretEditEntry `json:"entries"`
}

// GetSecretEditData reveals Secret values. Call this only after explicit user action.
func (m *Manager) GetSecretEditData(ctx context.Context, contextName, namespace, name string) (*SecretEditData, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	secret, err := client.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get secret %s: %w", name, err)
	}
	keys := make([]string, 0, len(secret.Data))
	for key := range secret.Data {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	entries := make([]SecretEditEntry, 0, len(keys))
	for _, key := range keys {
		value := secret.Data[key]
		if utf8.Valid(value) {
			entries = append(entries, SecretEditEntry{Key: key, Value: string(value)})
			continue
		}
		entries = append(entries, SecretEditEntry{
			Key:    key,
			Value:  base64.StdEncoding.EncodeToString(value),
			Binary: true,
		})
	}
	return &SecretEditData{
		Name:              secret.Name,
		Namespace:         secret.Namespace,
		ResourceVersion:   secret.ResourceVersion,
		Immutable:         secret.Immutable != nil && *secret.Immutable,
		Type:              string(secret.Type),
		Entries:           entries,
		Age:               formatAge(time.Since(secret.CreationTimestamp.Time)),
		CreationTimestamp: creationTime(secret.CreationTimestamp),
		Labels:            secret.Labels,
		Annotations:       secret.Annotations,
	}, nil
}

func validateSecretUpdate(entries []SecretEditEntry) (map[string][]byte, error) {
	data := make(map[string][]byte, len(entries))
	keys := make(map[string]struct{}, len(entries))
	size := 0
	for _, entry := range entries {
		if err := validateConfigStorageKey(entry.Key); err != nil {
			return nil, err
		}
		if _, exists := keys[entry.Key]; exists {
			return nil, fmt.Errorf("duplicate Secret key %q", entry.Key)
		}
		keys[entry.Key] = struct{}{}
		if entry.Binary {
			decoded, err := base64.StdEncoding.DecodeString(entry.Value)
			if err != nil {
				return nil, fmt.Errorf("value for key %q is not valid base64", entry.Key)
			}
			data[entry.Key] = decoded
			size += len(entry.Key) + len(decoded)
		} else {
			data[entry.Key] = []byte(entry.Value)
			size += len(entry.Key) + len(entry.Value)
		}
	}
	if size > 1<<20 {
		return nil, fmt.Errorf("Secret data exceeds the 1 MiB Kubernetes limit")
	}
	return data, nil
}

// ApplySecret updates a Secret after validation, dry-run, and resourceVersion checks.
func (m *Manager) ApplySecret(ctx context.Context, params SecretUpdateParams) (*ConfigStorageUpdateResult, error) {
	client, _, err := m.GetClientForContext(params.ContextName)
	if err != nil {
		return nil, err
	}
	current, err := client.CoreV1().Secrets(params.Namespace).Get(ctx, params.Name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get secret %s: %w", params.Name, err)
	}
	if current.Immutable != nil && *current.Immutable {
		return nil, fmt.Errorf("Secret %s is immutable", params.Name)
	}
	if params.ResourceVersion == "" || params.ResourceVersion != current.ResourceVersion {
		return nil, fmt.Errorf("Secret %s was modified by another user; reload and try again", params.Name)
	}
	data, err := validateSecretUpdate(params.Entries)
	if err != nil {
		return nil, err
	}
	updated := current.DeepCopy()
	updated.Data = data
	updated.StringData = nil
	updated.ManagedFields = nil
	if _, err := client.CoreV1().Secrets(params.Namespace).Update(ctx, updated, metav1.UpdateOptions{DryRun: []string{metav1.DryRunAll}, FieldManager: "kubeview"}); err != nil {
		return nil, fmt.Errorf("Secret dry-run failed: %w", err)
	}
	result, err := client.CoreV1().Secrets(params.Namespace).Update(ctx, updated, metav1.UpdateOptions{FieldManager: "kubeview"})
	if err != nil {
		return nil, fmt.Errorf("failed to update secret %s: %w", params.Name, err)
	}
	return &ConfigStorageUpdateResult{ResourceVersion: result.ResourceVersion}, nil
}
