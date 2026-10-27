package cluster

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
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

// PersistentVolumeSummary is a display-ready PersistentVolume row.
type PersistentVolumeSummary struct {
	Name              string            `json:"name"`
	Capacity          string            `json:"capacity"`
	AccessModes       []string          `json:"accessModes"`
	ReclaimPolicy     string            `json:"reclaimPolicy"`
	Status            string            `json:"status"`
	Claim             string            `json:"claim,omitempty"`
	StorageClass      string            `json:"storageClass,omitempty"`
	VolumeMode        string            `json:"volumeMode,omitempty"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

// StorageClassSummary is a display-ready StorageClass row.
type StorageClassSummary struct {
	Name                 string            `json:"name"`
	Provisioner          string            `json:"provisioner"`
	ReclaimPolicy        string            `json:"reclaimPolicy"`
	VolumeBindingMode    string            `json:"volumeBindingMode"`
	AllowVolumeExpansion bool              `json:"allowVolumeExpansion"`
	Default              bool              `json:"default"`
	Age                  string            `json:"age"`
	CreationTimestamp    string            `json:"creationTimestamp"`
	Labels               map[string]string `json:"labels,omitempty"`
	Annotations          map[string]string `json:"annotations,omitempty"`
}

type ListConfigMapsResult struct {
	Items      []ConfigMapSummary `json:"items"`
	TotalCount int                `json:"totalCount"`
}

type ListSecretsResult struct {
	Items      []SecretSummary `json:"items"`
	TotalCount int             `json:"totalCount"`
}

type ListPersistentVolumesResult struct {
	Items      []PersistentVolumeSummary `json:"items"`
	TotalCount int                       `json:"totalCount"`
}

type ListStorageClassesResult struct {
	Items      []StorageClassSummary `json:"items"`
	TotalCount int                   `json:"totalCount"`
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

// ListPersistentVolumes returns cluster-scoped PersistentVolume rows.
func (m *Manager) ListPersistentVolumes(ctx context.Context, contextName string) (*ListPersistentVolumesResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	list, err := client.CoreV1().PersistentVolumes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list persistent volumes: %w", err)
	}
	items := make([]PersistentVolumeSummary, 0, len(list.Items))
	for i := range list.Items {
		items = append(items, convertPersistentVolume(&list.Items[i]))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &ListPersistentVolumesResult{Items: items, TotalCount: len(items)}, nil
}

// ListStorageClasses returns cluster-scoped StorageClass rows.
func (m *Manager) ListStorageClasses(ctx context.Context, contextName string) (*ListStorageClassesResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	list, err := client.StorageV1().StorageClasses().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list storage classes: %w", err)
	}
	items := make([]StorageClassSummary, 0, len(list.Items))
	for i := range list.Items {
		items = append(items, convertStorageClass(&list.Items[i]))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return &ListStorageClassesResult{Items: items, TotalCount: len(items)}, nil
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

func convertPersistentVolume(volume *corev1.PersistentVolume) PersistentVolumeSummary {
	claim := ""
	if volume.Spec.ClaimRef != nil {
		claim = volume.Spec.ClaimRef.Namespace + "/" + volume.Spec.ClaimRef.Name
	}
	accessModes := make([]string, 0, len(volume.Spec.AccessModes))
	for _, mode := range volume.Spec.AccessModes {
		accessModes = append(accessModes, string(mode))
	}
	volumeMode := "Filesystem"
	if volume.Spec.VolumeMode != nil {
		volumeMode = string(*volume.Spec.VolumeMode)
	}
	reclaimPolicy := string(volume.Spec.PersistentVolumeReclaimPolicy)
	if reclaimPolicy == "" {
		reclaimPolicy = string(corev1.PersistentVolumeReclaimRetain)
	}
	return PersistentVolumeSummary{
		Name:              volume.Name,
		Capacity:          volume.Spec.Capacity.Storage().String(),
		AccessModes:       accessModes,
		ReclaimPolicy:     reclaimPolicy,
		Status:            string(volume.Status.Phase),
		Claim:             claim,
		StorageClass:      volume.Spec.StorageClassName,
		VolumeMode:        volumeMode,
		Age:               formatAge(time.Since(volume.CreationTimestamp.Time)),
		CreationTimestamp: creationTime(volume.CreationTimestamp),
		Labels:            volume.Labels,
		Annotations:       volume.Annotations,
	}
}

func convertStorageClass(storageClass *storagev1.StorageClass) StorageClassSummary {
	bindingMode := string(storagev1.VolumeBindingImmediate)
	if storageClass.VolumeBindingMode != nil {
		bindingMode = string(*storageClass.VolumeBindingMode)
	}
	reclaimPolicy := string(corev1.PersistentVolumeReclaimDelete)
	if storageClass.ReclaimPolicy != nil {
		reclaimPolicy = string(*storageClass.ReclaimPolicy)
	}
	isDefault := storageClass.Annotations["storageclass.kubernetes.io/is-default-class"] == "true" ||
		storageClass.Annotations["storageclass.beta.kubernetes.io/is-default-class"] == "true"
	return StorageClassSummary{
		Name:                 storageClass.Name,
		Provisioner:          storageClass.Provisioner,
		ReclaimPolicy:        reclaimPolicy,
		VolumeBindingMode:    bindingMode,
		AllowVolumeExpansion: storageClass.AllowVolumeExpansion != nil && *storageClass.AllowVolumeExpansion,
		Default:              isDefault,
		Age:                  formatAge(time.Since(storageClass.CreationTimestamp.Time)),
		CreationTimestamp:    creationTime(storageClass.CreationTimestamp),
		Labels:               storageClass.Labels,
		Annotations:          storageClass.Annotations,
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

// GetPersistentVolumeYaml exports a PersistentVolume manifest.
func (m *Manager) GetPersistentVolumeYaml(ctx context.Context, contextName, name string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	volume, err := client.CoreV1().PersistentVolumes().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get persistent volume %s: %w", name, err)
	}
	volume.TypeMeta = metav1.TypeMeta{APIVersion: "v1", Kind: "PersistentVolume"}
	volume.ManagedFields = nil
	data, err := yaml.Marshal(volume)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal persistent volume to YAML: %w", err)
	}
	return &PodYamlResult{YAML: string(data)}, nil
}

// GetStorageClassYaml exports a StorageClass manifest.
func (m *Manager) GetStorageClassYaml(ctx context.Context, contextName, name string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	storageClass, err := client.StorageV1().StorageClasses().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get storage class %s: %w", name, err)
	}
	storageClass.TypeMeta = metav1.TypeMeta{APIVersion: "storage.k8s.io/v1", Kind: "StorageClass"}
	storageClass.ManagedFields = nil
	data, err := yaml.Marshal(storageClass)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal storage class to YAML: %w", err)
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

type ConfigMapUpdateParams struct {
	ContextName     string            `json:"contextName"`
	Namespace       string            `json:"namespace"`
	Name            string            `json:"name"`
	ResourceVersion string            `json:"resourceVersion"`
	Data            map[string]string `json:"data"`
	BinaryData      map[string]string `json:"binaryData,omitempty"`
}

type SecretUpdateParams struct {
	ContextName     string            `json:"contextName"`
	Namespace       string            `json:"namespace"`
	Name            string            `json:"name"`
	ResourceVersion string            `json:"resourceVersion"`
	Entries         []SecretEditEntry `json:"entries"`
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
