package gitops

import (
	"encoding/json"
	"fmt"
	"reflect"
	"sort"
)

var ignoredMetadataFields = map[string]struct{}{
	"creationTimestamp":          {},
	"deletionGracePeriodSeconds": {},
	"deletionTimestamp":          {},
	"generation":                 {},
	"managedFields":              {},
	"resourceVersion":            {},
	"selfLink":                   {},
	"uid":                        {},
}

// Classify compares a desired manifest with its live resource. A missing live
// resource is reported as missing; otherwise every desired field must exist in
// the live object with an equal value. Extra live fields are ignored.
func Classify(desired map[string]interface{}, live *LiveResource) (Status, string) {
	if live == nil || !live.Found {
		return StatusMissing, "resource was not found in the cluster"
	}
	path := FirstDifference(desired, live.Object)
	if path == "" {
		return StatusClean, ""
	}
	return StatusChanged, fmt.Sprintf("field %q differs from the live resource", path)
}

// FirstDifference returns the dotted path of the first desired field that is
// absent from or different in the live object. Empty means the desired subset
// matches.
func FirstDifference(desired, live map[string]interface{}) string {
	path, equal := compareValue(desired, live, "")
	if equal {
		return ""
	}
	if path == "" {
		return "manifest"
	}
	return path
}

func compareValue(desired interface{}, live interface{}, path string) (string, bool) {
	switch desiredValue := desired.(type) {
	case map[string]interface{}:
		liveValue, ok := live.(map[string]interface{})
		if !ok {
			return path, false
		}
		keys := make([]string, 0, len(desiredValue))
		for key := range desiredValue {
			if isIgnoredField(path, key) {
				continue
			}
			keys = append(keys, key)
		}
		sort.Strings(keys)
		for _, key := range keys {
			childPath := joinPath(path, key)
			liveChild, exists := liveValue[key]
			if !exists {
				return childPath, false
			}
			if difference, equal := compareValue(desiredValue[key], liveChild, childPath); !equal {
				return difference, false
			}
		}
		return path, true
	case []interface{}:
		liveValue, ok := live.([]interface{})
		if !ok || len(desiredValue) != len(liveValue) {
			return path, false
		}
		for index := range desiredValue {
			childPath := fmt.Sprintf("%s[%d]", path, index)
			if difference, equal := compareValue(desiredValue[index], liveValue[index], childPath); !equal {
				return difference, false
			}
		}
		return path, true
	default:
		return path, valuesEqual(desired, live)
	}
}

// isIgnoredField drops server-owned status and runtime metadata. Extra live
// fields are already ignored by subset comparison; this also tolerates
// server-exported manifests that still contain these fields.
func isIgnoredField(path string, key string) bool {
	if path == "" && key == "status" {
		return true
	}
	if path != "metadata" {
		return false
	}
	_, ignored := ignoredMetadataFields[key]
	return ignored
}

func joinPath(path string, key string) string {
	if path == "" {
		return key
	}
	return path + "." + key
}

func valuesEqual(desired interface{}, live interface{}) bool {
	if desired == nil || live == nil {
		return desired == nil && live == nil
	}
	if reflect.DeepEqual(desired, live) {
		return true
	}
	desiredNumber, desiredIsNumber := numericValue(desired)
	liveNumber, liveIsNumber := numericValue(live)
	return desiredIsNumber && liveIsNumber && desiredNumber == liveNumber
}

func numericValue(value interface{}) (float64, bool) {
	switch typed := value.(type) {
	case int:
		return float64(typed), true
	case int8:
		return float64(typed), true
	case int16:
		return float64(typed), true
	case int32:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case uint:
		return float64(typed), true
	case uint8:
		return float64(typed), true
	case uint16:
		return float64(typed), true
	case uint32:
		return float64(typed), true
	case uint64:
		return float64(typed), true
	case float32:
		return float64(typed), true
	case float64:
		return typed, true
	case json.Number:
		parsed, err := typed.Float64()
		return parsed, err == nil
	default:
		return 0, false
	}
}
