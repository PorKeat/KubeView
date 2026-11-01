package cluster

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	shared "github.com/kubeview/engine/internal/domain/shared"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/chartutil"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/storage/driver"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/client-go/discovery"
	cachedmemory "k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"sigs.k8s.io/yaml"
)

const defaultHelmTimeout = 300 * time.Second

// helmRESTClientGetter adapts the manager's resolved rest.Config to Helm's
// client-go factory without writing a kubeconfig to disk.
type helmRESTClientGetter struct {
	restConfig *rest.Config
	namespace  string
}

func (g *helmRESTClientGetter) ToRESTConfig() (*rest.Config, error) {
	return g.restConfig, nil
}

func (g *helmRESTClientGetter) ToDiscoveryClient() (discovery.CachedDiscoveryInterface, error) {
	config := rest.CopyConfig(g.restConfig)
	config.Burst = 100
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return nil, err
	}
	return cachedmemory.NewMemCacheClient(discoveryClient), nil
}

func (g *helmRESTClientGetter) ToRESTMapper() (meta.RESTMapper, error) {
	discoveryClient, err := g.ToDiscoveryClient()
	if err != nil {
		return nil, err
	}
	mapper := restmapper.NewDeferredDiscoveryRESTMapper(discoveryClient)
	mapper.Reset()
	return mapper, nil
}

func (g *helmRESTClientGetter) ToRawKubeConfigLoader() clientcmd.ClientConfig {
	namespace := g.namespace
	if namespace == "" {
		namespace = "default"
	}
	return clientcmd.NewNonInteractiveClientConfig(
		*clientcmdapi.NewConfig(),
		"",
		&clientcmd.ConfigOverrides{Context: clientcmdapi.Context{Namespace: namespace}},
		nil,
	)
}

// NewHelmActionConfig builds a Helm action configuration for a context and
// release namespace using the engine's live REST configuration.
func (m *Manager) NewHelmActionConfig(contextName, namespace string) (*action.Configuration, error) {
	_, restConfig, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(namespace) == "" {
		namespace = "default"
	}
	helmRestConfig := rest.CopyConfig(restConfig)
	helmRestConfig.Timeout = 60 * time.Second
	getter := &helmRESTClientGetter{restConfig: helmRestConfig, namespace: namespace}
	config := new(action.Configuration)
	logger := func(format string, args ...interface{}) {
		// Helm's internal log output stays out of stdout so JSON-RPC framing
		// remains clean; the engine logger writes to stderr.
		_ = fmt.Sprintf(format, args...)
	}
	if err := config.Init(getter, namespace, "secret", logger); err != nil {
		return nil, fmt.Errorf("failed to initialize Helm: %w", err)
	}
	return config, nil
}

func selectHelmChartVersion(entries []helmIndexEntry, version string) (*helmIndexEntry, error) {
	if len(entries) == 0 {
		return nil, fmt.Errorf("chart not found in repository")
	}
	if strings.TrimSpace(version) != "" {
		for i := range entries {
			if entries[i].Version == strings.TrimSpace(version) {
				return &entries[i], nil
			}
		}
		return nil, fmt.Errorf("chart version %s not found", version)
	}
	best := -1
	var bestSemver *semver.Version
	for i := range entries {
		parsed, err := semver.NewVersion(entries[i].Version)
		if err != nil {
			continue
		}
		if bestSemver == nil || parsed.GreaterThan(bestSemver) {
			best = i
			bestSemver = parsed
		}
	}
	if best < 0 {
		return &entries[0], nil
	}
	return &entries[best], nil
}

// DownloadHelmChart fetches a chart archive from a repository and loads it.
func DownloadHelmChart(ctx context.Context, repositoryURL, chartName, version string) (*chart.Chart, error) {
	index, baseURL, err := fetchHelmIndex(ctx, repositoryURL)
	if err != nil {
		return nil, err
	}
	entries, ok := index.Entries[strings.TrimSpace(chartName)]
	if !ok {
		return nil, fmt.Errorf("chart %s not found in repository", chartName)
	}
	selected, err := selectHelmChartVersion(entries, version)
	if err != nil {
		return nil, err
	}
	if len(selected.URLs) == 0 {
		return nil, fmt.Errorf("chart %s %s has no downloadable URL", chartName, selected.Version)
	}
	chartURL := selected.URLs[0]
	if !strings.HasPrefix(chartURL, "http://") && !strings.HasPrefix(chartURL, "https://") {
		base, parseErr := url.Parse(strings.TrimRight(baseURL, "/") + "/")
		reference, refErr := url.Parse(chartURL)
		if parseErr != nil || refErr != nil {
			return nil, fmt.Errorf("invalid chart URL %q", chartURL)
		}
		chartURL = base.ResolveReference(reference).String()
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, chartURL, nil)
	if err != nil {
		return nil, fmt.Errorf("invalid chart URL: %w", err)
	}
	client := &http.Client{Timeout: 60 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("failed to download chart: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("chart download returned HTTP %d", response.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, 64<<20))
	if err != nil {
		return nil, fmt.Errorf("failed to read chart archive: %w", err)
	}
	if digest := strings.ToLower(strings.TrimSpace(selected.Digest)); strings.HasPrefix(digest, "sha256:") {
		sum := sha256.Sum256(body)
		if hex.EncodeToString(sum[:]) != strings.TrimPrefix(digest, "sha256:") {
			return nil, fmt.Errorf("chart digest verification failed for %s %s", chartName, selected.Version)
		}
	}
	loaded, err := loader.LoadArchive(bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("invalid chart archive: %w", err)
	}
	return loaded, nil
}

func parseHelmValues(values string) (map[string]interface{}, error) {
	if strings.TrimSpace(values) == "" {
		return map[string]interface{}{}, nil
	}
	parsed, err := chartutil.ReadValues([]byte(values))
	if err != nil {
		return nil, shared.Validation(fmt.Sprintf("invalid values YAML: %v", err))
	}
	return parsed, nil
}

func helmTimeout(seconds int) time.Duration {
	if seconds <= 0 {
		return defaultHelmTimeout
	}
	if seconds < 30 {
		seconds = 30
	}
	if seconds > 1800 {
		seconds = 1800
	}
	return time.Duration(seconds) * time.Second
}

// HelmReleaseActionResult is the normalized result of a Helm lifecycle action.
type HelmReleaseActionResult struct {
	Name        string `json:"name"`
	Namespace   string `json:"namespace"`
	Chart       string `json:"chart"`
	ChartVer    string `json:"chartVersion"`
	AppVersion  string `json:"appVersion,omitempty"`
	Revision    int    `json:"revision"`
	Status      string `json:"status"`
	Description string `json:"description,omitempty"`
}

func helmReleaseSummary(rel *release.Release) HelmReleaseActionResult {
	summary := HelmReleaseActionResult{
		Name:      rel.Name,
		Namespace: rel.Namespace,
		Revision:  rel.Version,
	}
	if rel.Info != nil {
		summary.Status = string(rel.Info.Status)
		summary.Description = rel.Info.Description
	}
	if rel.Chart != nil && rel.Chart.Metadata != nil {
		summary.Chart = rel.Chart.Metadata.Name
		summary.ChartVer = rel.Chart.Metadata.Version
		summary.AppVersion = rel.Chart.Metadata.AppVersion
	}
	return summary
}

// HelmInstallParams describes an install from a chart repository.
type HelmInstallParams struct {
	ContextName     string `json:"contextName"`
	ReleaseName     string `json:"releaseName"`
	Namespace       string `json:"namespace"`
	RepositoryURL   string `json:"repositoryUrl"`
	ChartName       string `json:"chartName"`
	Version         string `json:"version,omitempty"`
	Values          string `json:"values,omitempty"`
	CreateNamespace bool   `json:"createNamespace,omitempty"`
	Wait            bool   `json:"wait,omitempty"`
	TimeoutSeconds  int    `json:"timeoutSeconds,omitempty"`
}

// InstallHelmRelease installs a chart and returns the created revision.
func (m *Manager) InstallHelmRelease(ctx context.Context, p HelmInstallParams) (*HelmReleaseActionResult, error) {
	if strings.TrimSpace(p.ReleaseName) == "" {
		return nil, shared.Validation("releaseName is required")
	}
	if strings.TrimSpace(p.RepositoryURL) == "" || strings.TrimSpace(p.ChartName) == "" {
		return nil, shared.Validation("repositoryUrl and chartName are required")
	}
	if err := chartutil.ValidateReleaseName(p.ReleaseName); err != nil {
		return nil, shared.Validation(fmt.Sprintf("invalid release name: %v", err))
	}
	if strings.TrimSpace(p.Namespace) == "" {
		p.Namespace = "default"
	}
	values, err := parseHelmValues(p.Values)
	if err != nil {
		return nil, err
	}
	loaded, err := DownloadHelmChart(ctx, p.RepositoryURL, p.ChartName, p.Version)
	if err != nil {
		return nil, err
	}
	config, err := m.NewHelmActionConfig(p.ContextName, p.Namespace)
	if err != nil {
		return nil, err
	}
	install := action.NewInstall(config)
	install.ReleaseName = p.ReleaseName
	install.Namespace = p.Namespace
	install.CreateNamespace = p.CreateNamespace
	install.Wait = p.Wait
	install.Timeout = helmTimeout(p.TimeoutSeconds)
	install.Description = "Installed from KubeView"
	rel, err := install.RunWithContext(ctx, loaded, values)
	if err != nil {
		return nil, fmt.Errorf("helm install failed: %w", err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	summary := helmReleaseSummary(rel)
	return &summary, nil
}

// HelmUpgradeParams describes an upgrade from a chart repository.
type HelmUpgradeParams struct {
	ContextName    string `json:"contextName"`
	ReleaseName    string `json:"releaseName"`
	Namespace      string `json:"namespace"`
	RepositoryURL  string `json:"repositoryUrl"`
	ChartName      string `json:"chartName"`
	Version        string `json:"version,omitempty"`
	Values         string `json:"values,omitempty"`
	ReuseValues    bool   `json:"reuseValues,omitempty"`
	ResetValues    bool   `json:"resetValues,omitempty"`
	Wait           bool   `json:"wait,omitempty"`
	TimeoutSeconds int    `json:"timeoutSeconds,omitempty"`
}

// UpgradeHelmRelease upgrades an installed release.
func (m *Manager) UpgradeHelmRelease(ctx context.Context, p HelmUpgradeParams) (*HelmReleaseActionResult, error) {
	if strings.TrimSpace(p.ReleaseName) == "" {
		return nil, shared.Validation("releaseName is required")
	}
	if strings.TrimSpace(p.RepositoryURL) == "" || strings.TrimSpace(p.ChartName) == "" {
		return nil, shared.Validation("repositoryUrl and chartName are required")
	}
	if strings.TrimSpace(p.Namespace) == "" {
		p.Namespace = "default"
	}
	values, err := parseHelmValues(p.Values)
	if err != nil {
		return nil, err
	}
	loaded, err := DownloadHelmChart(ctx, p.RepositoryURL, p.ChartName, p.Version)
	if err != nil {
		return nil, err
	}
	config, err := m.NewHelmActionConfig(p.ContextName, p.Namespace)
	if err != nil {
		return nil, err
	}
	upgrade := action.NewUpgrade(config)
	upgrade.Namespace = p.Namespace
	upgrade.Wait = p.Wait
	upgrade.Timeout = helmTimeout(p.TimeoutSeconds)
	upgrade.ReuseValues = p.ReuseValues
	upgrade.ResetValues = p.ResetValues
	upgrade.Description = "Upgraded from KubeView"
	rel, err := upgrade.RunWithContext(ctx, p.ReleaseName, loaded, values)
	if err != nil {
		return nil, fmt.Errorf("helm upgrade failed: %w", err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	summary := helmReleaseSummary(rel)
	return &summary, nil
}

// HelmRollbackParams describes a rollback to an earlier revision.
type HelmRollbackParams struct {
	ContextName    string `json:"contextName"`
	ReleaseName    string `json:"releaseName"`
	Namespace      string `json:"namespace"`
	Revision       int    `json:"revision"`
	Wait           bool   `json:"wait,omitempty"`
	TimeoutSeconds int    `json:"timeoutSeconds,omitempty"`
}

// RollbackHelmRelease restores a previous release revision.
func (m *Manager) RollbackHelmRelease(ctx context.Context, p HelmRollbackParams) (*HelmReleaseActionResult, error) {
	if strings.TrimSpace(p.ReleaseName) == "" || p.Revision <= 0 {
		return nil, shared.Validation("releaseName and a positive revision are required")
	}
	if strings.TrimSpace(p.Namespace) == "" {
		p.Namespace = "default"
	}
	config, err := m.NewHelmActionConfig(p.ContextName, p.Namespace)
	if err != nil {
		return nil, err
	}
	rollback := action.NewRollback(config)
	rollback.Version = p.Revision
	rollback.Wait = p.Wait
	rollback.Timeout = helmTimeout(p.TimeoutSeconds)
	if err := rollback.Run(p.ReleaseName); err != nil {
		return nil, fmt.Errorf("helm rollback failed: %w", err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	history, err := action.NewHistory(config).Run(p.ReleaseName)
	if err != nil || len(history) == 0 {
		return &HelmReleaseActionResult{Name: p.ReleaseName, Namespace: p.Namespace}, nil
	}
	latest := history[len(history)-1]
	summary := helmReleaseSummary(latest)
	return &summary, nil
}

// HelmUninstallParams describes release removal.
type HelmUninstallParams struct {
	ContextName string `json:"contextName"`
	ReleaseName string `json:"releaseName"`
	Namespace   string `json:"namespace"`
	KeepHistory bool   `json:"keepHistory,omitempty"`
	Wait        bool   `json:"wait,omitempty"`
}

// UninstallHelmRelease removes a release and its resources.
func (m *Manager) UninstallHelmRelease(ctx context.Context, p HelmUninstallParams) error {
	if strings.TrimSpace(p.ReleaseName) == "" {
		return shared.Validation("releaseName is required")
	}
	if strings.TrimSpace(p.Namespace) == "" {
		p.Namespace = "default"
	}
	config, err := m.NewHelmActionConfig(p.ContextName, p.Namespace)
	if err != nil {
		return err
	}
	uninstall := action.NewUninstall(config)
	uninstall.KeepHistory = p.KeepHistory
	uninstall.Wait = p.Wait
	uninstall.Timeout = defaultHelmTimeout
	if _, err := uninstall.Run(p.ReleaseName); err != nil {
		return fmt.Errorf("helm uninstall failed: %w", err)
	}
	m.InvalidateOverviewCache(p.ContextName)
	return nil
}

// HelmReleaseRevision is one row of `helm history`.
type HelmReleaseRevision struct {
	Revision    int    `json:"revision"`
	Status      string `json:"status"`
	Chart       string `json:"chart"`
	ChartVer    string `json:"chartVersion"`
	AppVersion  string `json:"appVersion,omitempty"`
	Description string `json:"description,omitempty"`
	Updated     string `json:"updated"`
}

// GetHelmReleaseHistory returns the full revision history for a release.
func (m *Manager) GetHelmReleaseHistory(ctx context.Context, contextName, namespace, name string) ([]HelmReleaseRevision, error) {
	if strings.TrimSpace(namespace) == "" {
		namespace = "default"
	}
	config, err := m.NewHelmActionConfig(contextName, namespace)
	if err != nil {
		return nil, err
	}
	releases, err := action.NewHistory(config).Run(name)
	if err != nil {
		return nil, fmt.Errorf("failed to load release history: %w", err)
	}
	items := make([]HelmReleaseRevision, 0, len(releases))
	for _, rel := range releases {
		item := HelmReleaseRevision{Revision: rel.Version}
		if rel.Info != nil {
			item.Status = string(rel.Info.Status)
			item.Description = rel.Info.Description
			if !rel.Info.LastDeployed.IsZero() {
				item.Updated = rel.Info.LastDeployed.UTC().Format(time.RFC3339)
			}
		}
		if rel.Chart != nil && rel.Chart.Metadata != nil {
			item.Chart = rel.Chart.Metadata.Name
			item.ChartVer = rel.Chart.Metadata.Version
			item.AppVersion = rel.Chart.Metadata.AppVersion
		}
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Revision > items[j].Revision })
	return items, nil
}

// GetHelmReleaseValues returns the user-supplied values as YAML.
func (m *Manager) GetHelmReleaseValues(ctx context.Context, contextName, namespace, name string) (string, error) {
	if strings.TrimSpace(namespace) == "" {
		namespace = "default"
	}
	config, err := m.NewHelmActionConfig(contextName, namespace)
	if err != nil {
		return "", err
	}
	values, err := action.NewGetValues(config).Run(name)
	if err != nil {
		if errors.Is(err, driver.ErrReleaseNotFound) {
			return "", shared.NewError(shared.KindNotFound, fmt.Sprintf("release %s not found", name), err)
		}
		return "", fmt.Errorf("failed to load release values: %w", err)
	}
	if len(values) == 0 {
		return "", nil
	}
	data, err := yaml.Marshal(values)
	if err != nil {
		return "", fmt.Errorf("failed to encode values: %w", err)
	}
	return string(data), nil
}
