package cluster

import (
	"context"
	"fmt"
	"sort"
	"time"

	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

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

type ListPersistentVolumesResult struct {
	Items      []PersistentVolumeSummary `json:"items"`
	TotalCount int                       `json:"totalCount"`
}

type ListStorageClassesResult struct {
	Items      []StorageClassSummary `json:"items"`
	TotalCount int                   `json:"totalCount"`
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
