package gitops

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"time"

	domaingitops "github.com/kubeview/engine/internal/domain/gitops"
	shared "github.com/kubeview/engine/internal/domain/shared"
)

// Service orchestrates local manifest discovery, live resource reads, drift
// classification, and summary counts behind transport-independent ports.
type Service struct {
	source ManifestSource
	live   LiveReader
}

func New(source ManifestSource, live LiveReader) *Service {
	return &Service{source: source, live: live}
}

// Scan loads every manifest below request.Path, de-duplicates identities, and
// compares each manifest with the live cluster. Per-resource failures are
// reported as error entries rather than failing the whole scan.
func (service *Service) Scan(ctx context.Context, request ScanRequest) (*domaingitops.Report, error) {
	root, err := normalizePath(request.Path)
	if err != nil {
		return nil, err
	}
	contextName, err := service.resolveContext(ctx, request.ContextName)
	if err != nil {
		return nil, err
	}
	manifests, issues, err := service.source.Load(ctx, root)
	if err != nil {
		return nil, err
	}

	manifests = deduplicate(manifests)
	resources := make([]domaingitops.Drift, 0, len(manifests)+len(issues))
	for _, issue := range issues {
		resources = append(resources, domaingitops.Drift{
			SourceFile: issue.SourceFile,
			Status:     domaingitops.StatusError,
			Message:    issue.Message,
		})
	}
	for _, manifest := range manifests {
		if strings.EqualFold(manifest.Kind, "Secret") {
			resources = append(resources, domaingitops.Drift{
				APIVersion: manifest.APIVersion,
				Kind:       manifest.Kind,
				Name:       manifest.Name,
				Namespace:  manifest.Namespace,
				SourceFile: manifest.SourceFile,
				Status:     domaingitops.StatusError,
				Message:    "Secret manifests are excluded from GitOps drift until value redaction is implemented.",
			})
			continue
		}
		resources = append(resources, service.compare(ctx, contextName, manifest))
	}

	sortDrifts(resources)
	return buildReport(contextName, root, resources), nil
}

func (service *Service) compare(
	ctx context.Context,
	contextName string,
	manifest domaingitops.Manifest,
) domaingitops.Drift {
	drift := domaingitops.Drift{
		APIVersion:  manifest.APIVersion,
		Kind:        manifest.Kind,
		Name:        manifest.Name,
		Namespace:   manifest.Namespace,
		SourceFile:  manifest.SourceFile,
		DesiredYAML: manifest.DesiredYAML,
	}

	live, err := service.live.Read(ctx, contextName, manifest.Ref())
	if err != nil {
		drift.Status = domaingitops.StatusError
		drift.Message = errorMessage(err, "failed to read the live resource")
		applyLiveMetadata(&drift, live)
		return drift
	}

	status, message := domaingitops.Classify(manifest.Desired, live)
	drift.Status = status
	drift.Message = message
	if live != nil {
		drift.LiveYAML = live.YAML
		applyLiveMetadata(&drift, live)
	}
	return drift
}

func applyLiveMetadata(drift *domaingitops.Drift, live *domaingitops.LiveResource) {
	if live == nil {
		return
	}
	if live.Resource != "" {
		drift.Resource = live.Resource
	}
	if live.Namespace != "" {
		drift.Namespace = live.Namespace
	}
}

func (service *Service) resolveContext(ctx context.Context, requested string) (string, error) {
	contextName := strings.TrimSpace(requested)
	if contextName != "" {
		return contextName, nil
	}
	current, err := service.live.CurrentContext(ctx)
	if err != nil {
		return "", err
	}
	current = strings.TrimSpace(current)
	if current == "" {
		return "", shared.Validation("contextName is required when no current context is selected")
	}
	return current, nil
}

func normalizePath(path string) (string, error) {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return "", shared.Validation("path is required")
	}
	if !filepath.IsAbs(trimmed) {
		return "", shared.Validation("path must be an absolute directory path")
	}
	return filepath.Clean(trimmed), nil
}

func deduplicate(manifests []domaingitops.Manifest) []domaingitops.Manifest {
	seen := make(map[string]struct{}, len(manifests))
	result := make([]domaingitops.Manifest, 0, len(manifests))
	for _, manifest := range manifests {
		key := manifest.IdentityKey()
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, manifest)
	}
	return result
}

func sortDrifts(resources []domaingitops.Drift) {
	sort.SliceStable(resources, func(leftIndex, rightIndex int) bool {
		left := resources[leftIndex]
		right := resources[rightIndex]
		if left.SourceFile != right.SourceFile {
			return left.SourceFile < right.SourceFile
		}
		if left.APIVersion != right.APIVersion {
			return left.APIVersion < right.APIVersion
		}
		if left.Kind != right.Kind {
			return left.Kind < right.Kind
		}
		if left.Namespace != right.Namespace {
			return left.Namespace < right.Namespace
		}
		if left.Name != right.Name {
			return left.Name < right.Name
		}
		return left.Status < right.Status
	})
}

func buildReport(
	contextName string,
	path string,
	resources []domaingitops.Drift,
) *domaingitops.Report {
	report := &domaingitops.Report{
		ContextName: contextName,
		Path:        path,
		ScannedAt:   time.Now().UTC(),
		Total:       len(resources),
		Resources:   resources,
	}
	for _, resource := range resources {
		switch resource.Status {
		case domaingitops.StatusClean:
			report.Clean++
		case domaingitops.StatusChanged:
			report.Changed++
		case domaingitops.StatusMissing:
			report.Missing++
		default:
			report.Errors++
		}
	}
	return report
}

func errorMessage(err error, fallback string) string {
	if err == nil {
		return fallback
	}
	message := strings.TrimSpace(err.Error())
	if message == "" {
		return fallback
	}
	return message
}

func (service *Service) Validate() error {
	if service == nil || service.source == nil || service.live == nil {
		return fmt.Errorf("gitops service dependencies are not configured")
	}
	return nil
}
