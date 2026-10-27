package cluster

import (
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func convertGatewayResource(kind string, resource *unstructured.Unstructured) GatewayResourceSummary {
	summary := GatewayResourceSummary{
		Kind:              kind,
		Name:              resource.GetName(),
		Namespace:         resource.GetNamespace(),
		Hosts:             make([]string, 0),
		Addresses:         make([]string, 0),
		Labels:            resource.GetLabels(),
		Annotations:       resource.GetAnnotations(),
		Age:               formatAge(time.Since(resource.GetCreationTimestamp().Time)),
		CreationTimestamp: "",
	}
	if !resource.GetCreationTimestamp().Time.IsZero() {
		summary.CreationTimestamp = resource.GetCreationTimestamp().Time.Format(time.RFC3339)
	}

	switch kind {
	case "GatewayClass":
		summary.Class, _, _ = unstructured.NestedString(resource.Object, "spec", "controllerName")
		summary.Status = gatewayClassStatus(resource.Object)
	case "Gateway":
		summary.Class, _, _ = unstructured.NestedString(resource.Object, "spec", "gatewayClassName")
		listeners, _, _ := unstructured.NestedSlice(resource.Object, "spec", "listeners")
		summary.ListenerCount = len(listeners)
		for _, listener := range listeners {
			listenerMap, ok := listener.(map[string]interface{})
			if !ok {
				continue
			}
			hostname, _, _ := unstructured.NestedString(listenerMap, "hostname")
			summary.Hosts = appendUniqueString(summary.Hosts, hostname)
		}
		addresses, _, _ := unstructured.NestedSlice(resource.Object, "status", "addresses")
		for _, address := range addresses {
			addressMap, ok := address.(map[string]interface{})
			if !ok {
				continue
			}
			value, _, _ := unstructured.NestedString(addressMap, "value")
			summary.Addresses = appendUniqueString(summary.Addresses, value)
		}
		summary.Status = gatewayStatus(resource.Object)
	case "HTTPRoute", "GRPCRoute":
		hostnames, _, _ := unstructured.NestedStringSlice(resource.Object, "spec", "hostnames")
		for _, hostname := range hostnames {
			summary.Hosts = appendUniqueString(summary.Hosts, hostname)
		}
		rules, _, _ := unstructured.NestedSlice(resource.Object, "spec", "rules")
		summary.RuleCount = len(rules)
		parentRefs, _, _ := unstructured.NestedSlice(resource.Object, "spec", "parentRefs")
		parents := make([]string, 0, len(parentRefs))
		for _, parentRef := range parentRefs {
			parentMap, ok := parentRef.(map[string]interface{})
			if !ok {
				continue
			}
			name, _, _ := unstructured.NestedString(parentMap, "name")
			parentNamespace, _, _ := unstructured.NestedString(parentMap, "namespace")
			if name == "" {
				continue
			}
			if parentNamespace != "" {
				parents = append(parents, parentNamespace+"/"+name)
			} else {
				parents = append(parents, name)
			}
		}
		summary.Class = strings.Join(parents, ", ")
		summary.Status = gatewayRouteStatus(resource.Object)
	}

	return summary
}

func appendUniqueString(values []string, value string) []string {
	if value == "" {
		return values
	}
	for _, existing := range values {
		if existing == value {
			return values
		}
	}
	return append(values, value)
}

func gatewayConditionStatus(obj map[string]interface{}, conditionType string) string {
	conditions, _, _ := unstructured.NestedSlice(obj, "status", "conditions")
	for _, condition := range conditions {
		conditionMap, ok := condition.(map[string]interface{})
		if !ok {
			continue
		}
		kind, _, _ := unstructured.NestedString(conditionMap, "type")
		if kind != conditionType {
			continue
		}
		status, _, _ := unstructured.NestedString(conditionMap, "status")
		return status
	}
	return ""
}

func gatewayClassStatus(obj map[string]interface{}) string {
	switch gatewayConditionStatus(obj, "Accepted") {
	case "True":
		return "Accepted"
	case "False":
		return "Not Accepted"
	default:
		return "Unknown"
	}
}

func gatewayStatus(obj map[string]interface{}) string {
	switch gatewayConditionStatus(obj, "Programmed") {
	case "True":
		return "Programmed"
	case "False":
		return "Not Programmed"
	}
	switch gatewayConditionStatus(obj, "Accepted") {
	case "True":
		return "Accepted"
	case "False":
		return "Not Accepted"
	default:
		return "Pending"
	}
}

func gatewayRouteStatus(obj map[string]interface{}) string {
	parents, _, _ := unstructured.NestedSlice(obj, "status", "parents")
	if len(parents) == 0 {
		return "Unknown"
	}

	accepted := false
	denied := false
	for _, parent := range parents {
		parentMap, ok := parent.(map[string]interface{})
		if !ok {
			continue
		}
		conditions, _, _ := unstructured.NestedSlice(parentMap, "conditions")
		for _, condition := range conditions {
			conditionMap, ok := condition.(map[string]interface{})
			if !ok {
				continue
			}
			kind, _, _ := unstructured.NestedString(conditionMap, "type")
			if kind != "Accepted" {
				continue
			}
			status, _, _ := unstructured.NestedString(conditionMap, "status")
			switch status {
			case "True":
				accepted = true
			case "False":
				denied = true
			}
		}
	}

	if accepted {
		return "Accepted"
	}
	if denied {
		return "Not Accepted"
	}
	return "Pending"
}
