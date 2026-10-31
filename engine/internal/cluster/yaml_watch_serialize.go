package cluster

import (
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	sigsyaml "sigs.k8s.io/yaml"
)

// marshalWatchYAML serializes a watched object to YAML with the same hygiene
// as the one-shot getters: server-managed fields are stripped and Secret
// values are redacted.
func marshalWatchYAML(object *unstructured.Unstructured, kind string) (string, error) {
	clean := object.DeepCopy()
	unstructured.RemoveNestedField(clean.Object, "metadata", "managedFields")

	if strings.EqualFold(kind, "Secret") {
		return marshalRedactedSecret(clean)
	}

	if typed := typedObjectForKind(kind); typed != nil {
		if err := runtime.DefaultUnstructuredConverter.FromUnstructured(clean.Object, typed); err == nil {
			return marshalYAMLValue(typed)
		}
	}

	return marshalYAMLValue(clean.Object)
}

func marshalRedactedSecret(object *unstructured.Unstructured) (string, error) {
	metadata := map[string]interface{}{
		"name":      object.GetName(),
		"namespace": object.GetNamespace(),
	}
	if labels := object.GetLabels(); len(labels) > 0 {
		metadata["labels"] = labels
	}
	if annotations := object.GetAnnotations(); len(annotations) > 0 {
		metadata["annotations"] = annotations
	}

	redacted := map[string]interface{}{
		"apiVersion": "v1",
		"kind":       "Secret",
		"metadata":   metadata,
	}
	if secretType, found, _ := unstructured.NestedString(object.Object, "type"); found && secretType != "" {
		redacted["type"] = secretType
	}
	if data, found, _ := unstructured.NestedMap(object.Object, "data"); found && len(data) > 0 {
		values := make(map[string]interface{}, len(data))
		for key := range data {
			values[key] = "<redacted>"
		}
		redacted["data"] = values
	}
	if immutable, found, _ := unstructured.NestedBool(object.Object, "immutable"); found {
		redacted["immutable"] = immutable
	}

	return marshalYAMLValue(redacted)
}

func marshalYAMLValue(value interface{}) (string, error) {
	data, err := sigsyaml.Marshal(value)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// typedObjectForKind returns a typed Kubernetes object so the emitted YAML
// keeps the same field ordering as the one-shot getters. Kinds without a
// typed mapping fall back to unstructured serialization.
func typedObjectForKind(kind string) runtime.Object {
	switch kind {
	case "Pod":
		return &corev1.Pod{}
	case "Deployment":
		return &appsv1.Deployment{}
	case "ReplicaSet":
		return &appsv1.ReplicaSet{}
	case "StatefulSet":
		return &appsv1.StatefulSet{}
	case "DaemonSet":
		return &appsv1.DaemonSet{}
	case "Job":
		return &batchv1.Job{}
	case "CronJob":
		return &batchv1.CronJob{}
	case "Service":
		return &corev1.Service{}
	case "Endpoints":
		return &corev1.Endpoints{}
	case "ConfigMap":
		return &corev1.ConfigMap{}
	case "PersistentVolume":
		return &corev1.PersistentVolume{}
	case "ServiceAccount":
		return &corev1.ServiceAccount{}
	case "Ingress":
		return &networkingv1.Ingress{}
	case "NetworkPolicy":
		return &networkingv1.NetworkPolicy{}
	case "StorageClass":
		return &storagev1.StorageClass{}
	case "Role":
		return &rbacv1.Role{}
	case "ClusterRole":
		return &rbacv1.ClusterRole{}
	case "RoleBinding":
		return &rbacv1.RoleBinding{}
	case "ClusterRoleBinding":
		return &rbacv1.ClusterRoleBinding{}
	}
	return nil
}
