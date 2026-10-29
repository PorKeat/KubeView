// Package filesystem implements local manifest discovery for GitOps drift.
package filesystem

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/yaml"

	domaingitops "github.com/kubeview/engine/internal/domain/gitops"
	shared "github.com/kubeview/engine/internal/domain/shared"
)

// ManifestSource recursively loads Kubernetes manifests from a local
// directory. It skips hidden directories, node_modules, and YAML files without
// a Kubernetes resource identity.
type ManifestSource struct{}

func NewManifestSource() *ManifestSource {
	return &ManifestSource{}
}

func (source *ManifestSource) Load(
	ctx context.Context,
	root string,
) ([]domaingitops.Manifest, []domaingitops.ManifestIssue, error) {
	if err := ctx.Err(); err != nil {
		return nil, nil, err
	}
	info, err := os.Stat(root)
	if err != nil {
		return nil, nil, shared.NewError(
			shared.KindInvalid,
			fmt.Sprintf("unable to read manifest path %q", root),
			err,
		)
	}
	if !info.IsDir() {
		return nil, nil, shared.Validation(fmt.Sprintf("manifest path %q is not a directory", root))
	}

	manifests := make([]domaingitops.Manifest, 0)
	issues := make([]domaingitops.ManifestIssue, 0)
	walkErr := filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if walkErr != nil {
			issues = append(issues, domaingitops.ManifestIssue{
				SourceFile: path,
				Message:    walkErr.Error(),
			})
			if entry != nil && entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.IsDir() {
			if path != root && shouldSkipDirectory(entry.Name()) {
				return filepath.SkipDir
			}
			return nil
		}
		if !isManifestFile(entry.Name()) {
			return nil
		}
		fileManifests, fileIssues := loadFile(path)
		manifests = append(manifests, fileManifests...)
		issues = append(issues, fileIssues...)
		return nil
	})
	if walkErr != nil {
		return nil, nil, walkErr
	}
	return manifests, issues, nil
}

func loadFile(path string) ([]domaingitops.Manifest, []domaingitops.ManifestIssue) {
	file, err := os.Open(path)
	if err != nil {
		return nil, []domaingitops.ManifestIssue{{
			SourceFile: path,
			Message:    fmt.Sprintf("unable to read file: %v", err),
		}}
	}
	defer func() { _ = file.Close() }()

	manifests := make([]domaingitops.Manifest, 0)
	issues := make([]domaingitops.ManifestIssue, 0)
	reader := utilyaml.NewYAMLReader(bufio.NewReader(file))
	for {
		document, readErr := reader.Read()
		if readErr != nil {
			if !errors.Is(readErr, io.EOF) {
				issues = append(issues, domaingitops.ManifestIssue{
					SourceFile: path,
					Message:    fmt.Sprintf("unable to read YAML document: %v", readErr),
				})
			}
			break
		}
		if len(bytes.TrimSpace(document)) == 0 {
			continue
		}

		var value interface{}
		if err := yaml.Unmarshal(document, &value); err != nil {
			issues = append(issues, domaingitops.ManifestIssue{
				SourceFile: path,
				Message:    fmt.Sprintf("invalid YAML: %v", err),
			})
			continue
		}
		object, ok := value.(map[string]interface{})
		if !ok || len(object) == 0 {
			continue
		}
		manifests = append(manifests, manifestsFromObject(object, path)...)
	}
	return manifests, issues
}

func manifestsFromObject(object map[string]interface{}, sourceFile string) []domaingitops.Manifest {
	if stringValue(object["kind"]) == "List" {
		items, ok := object["items"].([]interface{})
		if !ok {
			return nil
		}
		manifests := make([]domaingitops.Manifest, 0, len(items))
		for _, item := range items {
			itemObject, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			if manifest, valid := manifestFromObject(itemObject, sourceFile); valid {
				manifests = append(manifests, manifest)
			}
		}
		return manifests
	}
	if manifest, valid := manifestFromObject(object, sourceFile); valid {
		return []domaingitops.Manifest{manifest}
	}
	return nil
}

func manifestFromObject(
	object map[string]interface{},
	sourceFile string,
) (domaingitops.Manifest, bool) {
	apiVersion := stringValue(object["apiVersion"])
	kind := stringValue(object["kind"])
	metadata, ok := object["metadata"].(map[string]interface{})
	if !ok {
		return domaingitops.Manifest{}, false
	}
	name := stringValue(metadata["name"])
	namespace := stringValue(metadata["namespace"])
	if apiVersion == "" || kind == "" || name == "" {
		return domaingitops.Manifest{}, false
	}

	object["apiVersion"] = apiVersion
	object["kind"] = kind
	metadata["name"] = name
	if namespace == "" {
		delete(metadata, "namespace")
	} else {
		metadata["namespace"] = namespace
	}
	sanitizeDesired(object)

	yamlText, err := yaml.Marshal(object)
	if err != nil {
		return domaingitops.Manifest{}, false
	}
	return domaingitops.Manifest{
		APIVersion:  apiVersion,
		Kind:        kind,
		Name:        name,
		Namespace:   namespace,
		SourceFile:  sourceFile,
		Desired:     object,
		DesiredYAML: string(yamlText),
	}, true
}

// sanitizeDesired removes server-owned fields from a desired manifest before
// comparison and rendering.
func sanitizeDesired(object map[string]interface{}) {
	delete(object, "status")
	if metadata, ok := object["metadata"].(map[string]interface{}); ok {
		delete(metadata, "managedFields")
	}
}

func shouldSkipDirectory(name string) bool {
	return name == "node_modules" || strings.HasPrefix(name, ".")
}

func isManifestFile(name string) bool {
	extension := strings.ToLower(filepath.Ext(name))
	return extension == ".yaml" || extension == ".yml"
}

func stringValue(value interface{}) string {
	text, ok := value.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(text)
}
