package cluster

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"
)

type helmReleaseInfo struct {
	Status       string    `json:"status"`
	Description  string    `json:"description"`
	LastDeployed time.Time `json:"last_deployed"`
}

type helmChartMetadata struct {
	Name       string `json:"name"`
	Version    string `json:"version"`
	AppVersion string `json:"appVersion"`
}

type helmReleasePayload struct {
	Name      string          `json:"name"`
	Namespace string          `json:"namespace"`
	Version   int             `json:"version"`
	Info      helmReleaseInfo `json:"info"`
	Chart     struct {
		Metadata helmChartMetadata `json:"metadata"`
	} `json:"chart"`
}

func decodeHelmRelease(data []byte) (*helmReleasePayload, error) {
	candidates := [][]byte{data}
	if decoded, err := base64.StdEncoding.DecodeString(string(data)); err == nil {
		candidates = append(candidates, decoded)
	}

	for _, candidate := range candidates {
		if gzipReader, err := gzip.NewReader(bytes.NewReader(candidate)); err == nil {
			payload := &helmReleasePayload{}
			if err := json.NewDecoder(gzipReader).Decode(payload); err == nil {
				_ = gzipReader.Close()
				return payload, nil
			}
			_ = gzipReader.Close()
		}
		payload := &helmReleasePayload{}
		if err := json.Unmarshal(candidate, payload); err == nil && payload.Name != "" {
			return payload, nil
		}
	}

	return nil, fmt.Errorf("release payload is not valid Helm JSON")
}

func helmReleaseTone(status string) string {
	switch status {
	case "deployed":
		return "healthy"
	case "failed":
		return "critical"
	case "pending-install", "pending-upgrade", "pending-rollback", "pending-uninstall":
		return "warning"
	default:
		return "muted"
	}
}

func listSimpleHelmReleases(ctx context.Context, client kubernetes.Interface, namespace string) (*SimpleResourceListResult, error) {
	kind := "helmreleases"
	list, err := client.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "owner=helm",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list Helm release secrets: %w", err)
	}

	items := make([]SimpleResourceItem, 0, len(list.Items))
	for i := range list.Items {
		secret := &list.Items[i]
		if secret.Type != corev1.SecretType("helm.sh/release.v1") {
			continue
		}
		release, decodeErr := decodeHelmRelease(secret.Data["release"])
		if decodeErr != nil {
			continue
		}
		status := release.Info.Status
		if status == "" {
			status = "unknown"
		}
		updated := release.Info.LastDeployed
		if updated.IsZero() {
			updated = secret.CreationTimestamp.Time
		}
		name := release.Name
		if name == "" {
			name = secret.Name
		}
		releaseNamespace := release.Namespace
		if releaseNamespace == "" {
			releaseNamespace = secret.Namespace
		}
		items = append(items, simpleItemFromObject(
			name, releaseNamespace, status, helmReleaseTone(status), updated,
			map[string]string{
				"chart":        release.Chart.Metadata.Name,
				"chartVersion": release.Chart.Metadata.Version,
				"appVersion":   release.Chart.Metadata.AppVersion,
				"revision":     fmt.Sprintf("%d", release.Version),
				"updated":      updated.UTC().Format(time.RFC3339),
				"description":  release.Info.Description,
			},
			secret.Labels, secret.Annotations,
		))
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace != items[j].Namespace {
			return items[i].Namespace < items[j].Namespace
		}
		return items[i].Name < items[j].Name
	})
	return &SimpleResourceListResult{Kind: kind, Items: items, TotalCount: len(items)}, nil
}

type HelmChartSummary struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	AppVersion  string `json:"appVersion,omitempty"`
	Description string `json:"description,omitempty"`
}

type HelmChartsResult struct {
	RepositoryURL string             `json:"repositoryUrl"`
	Charts        []HelmChartSummary `json:"charts"`
	TotalCount    int                `json:"totalCount"`
}

type helmIndexFile struct {
	Entries map[string][]struct {
		Name        string `yaml:"name"`
		Version     string `yaml:"version"`
		AppVersion  string `yaml:"appVersion"`
		Description string `yaml:"description"`
	} `yaml:"entries"`
}

// FetchHelmCharts downloads and parses a Helm repository index. It only
// accepts HTTP(S) URLs, caps the response size, and never writes to disk.
func FetchHelmCharts(ctx context.Context, repositoryURL string) (*HelmChartsResult, error) {
	parsed, err := url.Parse(strings.TrimSpace(repositoryURL))
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return nil, fmt.Errorf("repository URL must be http:// or https://")
	}
	indexURL := strings.TrimRight(parsed.String(), "/")
	if !strings.HasSuffix(strings.ToLower(indexURL), ".yaml") && !strings.HasSuffix(strings.ToLower(indexURL), ".yml") {
		indexURL += "/index.yaml"
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, indexURL, nil)
	if err != nil {
		return nil, fmt.Errorf("invalid chart repository URL: %w", err)
	}
	httpClient := &http.Client{Timeout: 15 * time.Second}
	response, err := httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch chart repository: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("chart repository returned HTTP %d", response.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, 10<<20))
	if err != nil {
		return nil, fmt.Errorf("failed to read chart index: %w", err)
	}
	index := &helmIndexFile{}
	if err := yaml.Unmarshal(body, index); err != nil {
		return nil, fmt.Errorf("invalid Helm index: %w", err)
	}

	charts := make([]HelmChartSummary, 0)
	for name, versions := range index.Entries {
		for _, version := range versions {
			chartName := version.Name
			if chartName == "" {
				chartName = name
			}
			charts = append(charts, HelmChartSummary{
				Name:        chartName,
				Version:     version.Version,
				AppVersion:  version.AppVersion,
				Description: version.Description,
			})
		}
	}
	sort.Slice(charts, func(i, j int) bool {
		if charts[i].Name != charts[j].Name {
			return charts[i].Name < charts[j].Name
		}
		return charts[i].Version < charts[j].Version
	})
	if len(charts) > 1000 {
		charts = charts[:1000]
	}
	return &HelmChartsResult{
		RepositoryURL: repositoryURL,
		Charts:        charts,
		TotalCount:    len(charts),
	}, nil
}
