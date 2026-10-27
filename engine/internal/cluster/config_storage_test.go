package cluster

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func boolPointer(value bool) *bool {
	return &value
}

func storageTestManager() *Manager {
	retain := corev1.PersistentVolumeReclaimRetain
	binding := storagev1.VolumeBindingWaitForFirstConsumer
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "app-config",
			Namespace:         "default",
			ResourceVersion:   "1",
			CreationTimestamp: metav1.Now(),
		},
		Data:       map[string]string{"app.conf": "enabled=true"},
		BinaryData: map[string][]byte{"logo": []byte("binary")},
	}
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "database-secret",
			Namespace:         "default",
			ResourceVersion:   "1",
			CreationTimestamp: metav1.Now(),
		},
		Type: corev1.SecretTypeOpaque,
		Data: map[string][]byte{"password": []byte("super-secret-value")},
	}
	volume := &corev1.PersistentVolume{
		ObjectMeta: metav1.ObjectMeta{Name: "pv-data", CreationTimestamp: metav1.Now()},
		Spec: corev1.PersistentVolumeSpec{
			Capacity: corev1.ResourceList{
				corev1.ResourceStorage: resource.MustParse("5Gi"),
			},
			AccessModes:                   []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce},
			PersistentVolumeReclaimPolicy: retain,
			StorageClassName:              "fast",
		},
		Status: corev1.PersistentVolumeStatus{Phase: corev1.VolumeBound},
	}
	storageClass := &storagev1.StorageClass{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "fast",
			CreationTimestamp: metav1.Now(),
			Annotations: map[string]string{
				"storageclass.kubernetes.io/is-default-class": "true",
			},
		},
		Provisioner:          "kubernetes.io/aws-ebs",
		ReclaimPolicy:        &retain,
		VolumeBindingMode:    &binding,
		AllowVolumeExpansion: boolPointer(true),
	}
	return newFakeManager(fake.NewSimpleClientset(configMap, secret, volume, storageClass))
}

func TestConfigStorageListsAndCounts(t *testing.T) {
	manager := storageTestManager()
	ctx := context.Background()

	configMaps, err := manager.ListConfigMaps(ctx, "test", "default")
	if err != nil {
		t.Fatalf("ListConfigMaps: %v", err)
	}
	if configMaps.TotalCount != 1 || len(configMaps.Items) != 1 {
		t.Fatalf("unexpected configmaps: %+v", configMaps)
	}
	configMap := configMaps.Items[0]
	if configMap.Name != "app-config" || configMap.DataKeyCount != 1 || configMap.BinaryKeyCount != 1 {
		t.Fatalf("unexpected configmap summary: %+v", configMap)
	}
	if len(configMap.Keys) != 2 {
		t.Fatalf("configmap keys = %#v, want 2", configMap.Keys)
	}

	secrets, err := manager.ListSecrets(ctx, "test", "default")
	if err != nil {
		t.Fatalf("ListSecrets: %v", err)
	}
	if secrets.TotalCount != 1 || secrets.Items[0].Type != string(corev1.SecretTypeOpaque) {
		t.Fatalf("unexpected secrets: %+v", secrets)
	}
	secretJSON, _ := json.Marshal(secrets)
	if strings.Contains(string(secretJSON), "super-secret-value") {
		t.Fatal("secret list leaked a secret value")
	}

	volumes, err := manager.ListPersistentVolumes(ctx, "test")
	if err != nil {
		t.Fatalf("ListPersistentVolumes: %v", err)
	}
	if volumes.TotalCount != 1 || volumes.Items[0].Capacity != "5Gi" || volumes.Items[0].Status != "Bound" {
		t.Fatalf("unexpected persistent volumes: %+v", volumes)
	}

	classes, err := manager.ListStorageClasses(ctx, "test")
	if err != nil {
		t.Fatalf("ListStorageClasses: %v", err)
	}
	if classes.TotalCount != 1 || !classes.Items[0].Default || classes.Items[0].Provisioner != "kubernetes.io/aws-ebs" {
		t.Fatalf("unexpected storage classes: %+v", classes)
	}

	counts, err := manager.GetNetworkingCounts(ctx, "test", "default")
	if err != nil {
		t.Fatalf("GetNetworkingCounts: %v", err)
	}
	if counts.ConfigMaps != 1 || counts.Secrets != 1 || counts.PersistentVolumes != 1 || counts.StorageClasses != 1 {
		t.Fatalf("unexpected storage counts: %+v", counts)
	}
}

func TestConfigStorageYAMLAndSecretRedaction(t *testing.T) {
	manager := storageTestManager()
	ctx := context.Background()

	configMapYaml, err := manager.GetConfigMapYaml(ctx, "test", "default", "app-config")
	if err != nil {
		t.Fatalf("GetConfigMapYaml: %v", err)
	}
	if !strings.Contains(configMapYaml.YAML, "enabled=true") {
		t.Fatalf("configmap YAML missing data: %s", configMapYaml.YAML)
	}

	secretYaml, err := manager.GetSecretYaml(ctx, "test", "default", "database-secret")
	if err != nil {
		t.Fatalf("GetSecretYaml: %v", err)
	}
	if !strings.Contains(secretYaml.YAML, "<redacted>") {
		t.Fatalf("secret YAML is not redacted: %s", secretYaml.YAML)
	}
	if strings.Contains(secretYaml.YAML, "super-secret-value") {
		t.Fatalf("secret YAML leaked the secret value: %s", secretYaml.YAML)
	}

	volumeYaml, err := manager.GetPersistentVolumeYaml(ctx, "test", "pv-data")
	if err != nil {
		t.Fatalf("GetPersistentVolumeYaml: %v", err)
	}
	if !strings.Contains(volumeYaml.YAML, "fast") {
		t.Fatalf("persistent volume YAML missing storage class: %s", volumeYaml.YAML)
	}

	classYaml, err := manager.GetStorageClassYaml(ctx, "test", "fast")
	if err != nil {
		t.Fatalf("GetStorageClassYaml: %v", err)
	}
	if !strings.Contains(classYaml.YAML, "kubernetes.io/aws-ebs") {
		t.Fatalf("storage class YAML missing provisioner: %s", classYaml.YAML)
	}
}

func TestConfigStorageEditDataAndApply(t *testing.T) {
	manager := storageTestManager()
	ctx := context.Background()

	configMapEdit, err := manager.GetConfigMapEditData(ctx, "test", "default", "app-config")
	if err != nil {
		t.Fatalf("GetConfigMapEditData: %v", err)
	}
	if configMapEdit.Data["app.conf"] != "enabled=true" || configMapEdit.BinaryData["logo"] == "" {
		t.Fatalf("unexpected ConfigMap edit data: %+v", configMapEdit)
	}
	configMapResult, err := manager.ApplyConfigMap(ctx, ConfigMapUpdateParams{
		ContextName:     "test",
		Namespace:       "default",
		Name:            "app-config",
		ResourceVersion: configMapEdit.ResourceVersion,
		Data:            map[string]string{"app.conf": "enabled=false", "new": "value"},
		BinaryData:      configMapEdit.BinaryData,
	})
	if err != nil {
		t.Fatalf("ApplyConfigMap: %v", err)
	}
	if configMapResult.ResourceVersion == "" {
		t.Fatal("expected ConfigMap update resourceVersion")
	}

	secretEdit, err := manager.GetSecretEditData(ctx, "test", "default", "database-secret")
	if err != nil {
		t.Fatalf("GetSecretEditData: %v", err)
	}
	if len(secretEdit.Entries) != 1 || secretEdit.Entries[0].Value != "super-secret-value" {
		t.Fatalf("unexpected Secret edit entries: %+v", secretEdit.Entries)
	}
	secretResult, err := manager.ApplySecret(ctx, SecretUpdateParams{
		ContextName:     "test",
		Namespace:       "default",
		Name:            "database-secret",
		ResourceVersion: secretEdit.ResourceVersion,
		Entries: []SecretEditEntry{
			{Key: "password", Value: "updated-secret"},
			{Key: "new-key", Value: "new-value"},
		},
	})
	if err != nil {
		t.Fatalf("ApplySecret: %v", err)
	}
	if secretResult.ResourceVersion == "" {
		t.Fatal("expected Secret update resourceVersion")
	}
}

func TestConfigStorageEditConflictAndImmutable(t *testing.T) {
	manager := storageTestManager()
	ctx := context.Background()
	if _, err := manager.ApplyConfigMap(ctx, ConfigMapUpdateParams{
		ContextName:     "test",
		Namespace:       "default",
		Name:            "app-config",
		ResourceVersion: "stale",
		Data:            map[string]string{"app.conf": "x"},
	}); err == nil {
		t.Fatal("expected ConfigMap resourceVersion conflict")
	}
	immutable := true
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:            "immutable-config",
			Namespace:       "default",
			ResourceVersion: "1",
		},
		Immutable: &immutable,
	}
	manager = newFakeManager(fake.NewSimpleClientset(configMap))
	if _, err := manager.ApplyConfigMap(ctx, ConfigMapUpdateParams{
		ContextName:     "test",
		Namespace:       "default",
		Name:            "immutable-config",
		ResourceVersion: "1",
		Data:            map[string]string{"key": "value"},
	}); err == nil {
		t.Fatal("expected immutable ConfigMap to reject updates")
	}
}
