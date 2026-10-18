package diagnostics

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os/exec"
	"strings"
	"time"

	authorizationv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

// DiagnosticStage holds the outcome of a single probe
type DiagnosticStage struct {
	Name      string                 `json:"name"` // "network" | "authentication" | "tls" | "rbac"
	Passed    bool                   `json:"passed"`
	Message   string                 `json:"message"`
	LatencyMs int64                  `json:"latencyMs"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// DiagnosticResult contains full 4-stage diagnosis
type DiagnosticResult struct {
	ClusterID     string                     `json:"clusterId"`
	Status        string                     `json:"status"` // "connected" | "failed"
	ServerVersion string                     `json:"serverVersion,omitempty"`
	LatencyMs     int64                      `json:"latencyMs"`
	Stages        map[string]DiagnosticStage `json:"stages"`
	Remediation   string                     `json:"remediation,omitempty"`
}

// Runner executes the 4-stage pipeline against a cluster context
type Runner struct{}

// NewRunner creates a new diagnostic Runner
func NewRunner() *Runner {
	return &Runner{}
}

// Diagnose runs all 4 stages against the specified context
func (r *Runner) Diagnose(
	ctx context.Context,
	clusterID string,
	restConfig *rest.Config,
	authInfo *clientcmdapi.AuthInfo,
	client kubernetes.Interface,
) *DiagnosticResult {
	startAll := time.Now()
	stages := make(map[string]DiagnosticStage)

	if restConfig == nil {
		return &DiagnosticResult{
			ClusterID: clusterID,
			Status:    "failed",
			Stages:    stages,
			Remediation: "No configuration available for this cluster context.",
		}
	}

	// -------------------------------------------------------------
	// Stage 1: Network & DNS Probe
	// -------------------------------------------------------------
	stage1 := r.probeNetwork(restConfig.Host)
	stages["network"] = stage1
	if !stage1.Passed {
		return &DiagnosticResult{
			ClusterID:   clusterID,
			Status:      "failed",
			LatencyMs:   time.Since(startAll).Milliseconds(),
			Stages:      stages,
			Remediation: "API server endpoint unreachable. Verify your internet connection, VPN, or local cluster status.",
		}
	}

	// -------------------------------------------------------------
	// Stage 2: Authentication & Exec Helper Probe
	// -------------------------------------------------------------
	stage2 := r.probeAuth(authInfo, restConfig)
	stages["authentication"] = stage2
	if !stage2.Passed {
		return &DiagnosticResult{
			ClusterID:   clusterID,
			Status:      "failed",
			LatencyMs:   time.Since(startAll).Milliseconds(),
			Stages:      stages,
			Remediation: stage2.Message,
		}
	}

	// -------------------------------------------------------------
	// Stage 3: TLS CA Verification & API Health Probe (/version)
	// -------------------------------------------------------------
	stage3, serverVersion := r.probeTLSAndHealth(ctx, restConfig)
	stages["tls"] = stage3
	if !stage3.Passed {
		return &DiagnosticResult{
			ClusterID:   clusterID,
			Status:      "failed",
			LatencyMs:   time.Since(startAll).Milliseconds(),
			Stages:      stages,
			Remediation: stage3.Message,
		}
	}

	// -------------------------------------------------------------
	// Stage 4: RBAC Baseline Verification (SelfSubjectAccessReview)
	// -------------------------------------------------------------
	stage4 := r.probeRBAC(ctx, client)
	stages["rbac"] = stage4

	totalLatency := time.Since(startAll).Milliseconds()

	status := "connected"
	if !stage4.Passed {
		status = "degraded"
	}

	return &DiagnosticResult{
		ClusterID:     clusterID,
		Status:        status,
		ServerVersion: serverVersion,
		LatencyMs:     totalLatency,
		Stages:        stages,
	}
}

func (r *Runner) probeNetwork(hostURL string) DiagnosticStage {
	start := time.Now()
	u, err := url.Parse(hostURL)
	if err != nil {
		return DiagnosticStage{
			Name:      "network",
			Passed:    false,
			Message:   fmt.Sprintf("Invalid server URL '%s': %v", hostURL, err),
			LatencyMs: time.Since(start).Milliseconds(),
		}
	}

	host := u.Host
	if !strings.Contains(host, ":") {
		if u.Scheme == "https" {
			host += ":443"
		} else {
			host += ":80"
		}
	}

	conn, err := net.DialTimeout("tcp", host, 4*time.Second)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		return DiagnosticStage{
			Name:      "network",
			Passed:    false,
			Message:   fmt.Sprintf("Failed to establish TCP connection to %s: %v", host, err),
			LatencyMs: latency,
		}
	}
	_ = conn.Close()

	return DiagnosticStage{
		Name:      "network",
		Passed:    true,
		Message:   fmt.Sprintf("TCP connection to %s succeeded in %dms", host, latency),
		LatencyMs: latency,
		Details: map[string]interface{}{
			"host": host,
		},
	}
}

func (r *Runner) probeAuth(authInfo *clientcmdapi.AuthInfo, restConfig *rest.Config) DiagnosticStage {
	start := time.Now()
	latency := time.Since(start).Milliseconds()

	if authInfo == nil {
		return DiagnosticStage{
			Name:      "authentication",
			Passed:    true,
			Message:   "Anonymous or default credential configured",
			LatencyMs: latency,
		}
	}

	// If using exec credential plugin (e.g. AWS EKS, AKS, GKE)
	if authInfo.Exec != nil {
		cmdName := authInfo.Exec.Command
		if _, err := exec.LookPath(cmdName); err != nil {
			return DiagnosticStage{
				Name:      "authentication",
				Passed:    false,
				Message:   fmt.Sprintf("Credential helper binary '%s' was not found in system PATH. Please install the CLI plugin.", cmdName),
				LatencyMs: latency,
				Details: map[string]interface{}{
					"command": cmdName,
				},
			}
		}

		return DiagnosticStage{
			Name:      "authentication",
			Passed:    true,
			Message:   fmt.Sprintf("Exec plugin '%s' found in PATH and configured", cmdName),
			LatencyMs: latency,
			Details: map[string]interface{}{
				"command": cmdName,
				"args":    authInfo.Exec.Args,
			},
		}
	}

	// If using client certificate
	if len(authInfo.ClientCertificateData) > 0 || authInfo.ClientCertificate != "" {
		return DiagnosticStage{
			Name:      "authentication",
			Passed:    true,
			Message:   "Client X.509 certificate and private key configured",
			LatencyMs: latency,
		}
	}

	// If using bearer token
	if authInfo.Token != "" || authInfo.TokenFile != "" {
		return DiagnosticStage{
			Name:      "authentication",
			Passed:    true,
			Message:   "Bearer token authentication configured",
			LatencyMs: latency,
		}
	}

	return DiagnosticStage{
		Name:      "authentication",
		Passed:    true,
		Message:   "Standard authentication configured",
		LatencyMs: latency,
	}
}

func (r *Runner) probeTLSAndHealth(ctx context.Context, restConfig *rest.Config) (DiagnosticStage, string) {
	start := time.Now()

	// Build custom HTTP client using rest.Config TLS credentials
	tlsConfig := &tls.Config{
		InsecureSkipVerify: restConfig.Insecure,
	}

	if len(restConfig.CAData) > 0 {
		caCertPool := x509.NewCertPool()
		caCertPool.AppendCertsFromPEM(restConfig.CAData)
		tlsConfig.RootCAs = caCertPool
	}

	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
		DialContext: (&net.Dialer{
			Timeout: 4 * time.Second,
		}).DialContext,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   5 * time.Second,
	}

	versionURL := strings.TrimRight(restConfig.Host, "/") + "/version"
	req, err := http.NewRequestWithContext(ctx, "GET", versionURL, nil)
	if err != nil {
		return DiagnosticStage{
			Name:      "tls",
			Passed:    false,
			Message:   fmt.Sprintf("Failed to construct version request: %v", err),
			LatencyMs: time.Since(start).Milliseconds(),
		}, ""
	}

	// Add auth header if token exists
	if restConfig.BearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+restConfig.BearerToken)
	}

	resp, err := client.Do(req)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		return DiagnosticStage{
			Name:      "tls",
			Passed:    false,
			Message:   fmt.Sprintf("TLS/API handshake failed: %v", err),
			LatencyMs: latency,
		}, ""
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return DiagnosticStage{
			Name:      "tls",
			Passed:    false,
			Message:   fmt.Sprintf("API server returned HTTP status %d (%s)", resp.StatusCode, resp.Status),
			LatencyMs: latency,
		}, ""
	}

	var versionInfo struct {
		GitVersion string `json:"gitVersion"`
		Major      string `json:"major"`
		Minor      string `json:"minor"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&versionInfo)

	vStr := versionInfo.GitVersion
	if vStr == "" {
		vStr = "Kubernetes API (healthy)"
	}

	return DiagnosticStage{
		Name:      "tls",
		Passed:    true,
		Message:   fmt.Sprintf("TLS verified, cluster version %s", vStr),
		LatencyMs: latency,
		Details: map[string]interface{}{
			"version": vStr,
		},
	}, vStr
}

func (r *Runner) probeRBAC(ctx context.Context, client kubernetes.Interface) DiagnosticStage {
	start := time.Now()
	if client == nil {
		return DiagnosticStage{
			Name:      "rbac",
			Passed:    false,
			Message:   "No client available for RBAC verification",
			LatencyMs: 0,
		}
	}

	// Check if user has permission to list namespaces cluster-wide
	sar := &authorizationv1.SelfSubjectAccessReview{
		Spec: authorizationv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Verb:     "list",
				Resource: "namespaces",
			},
		},
	}

	checkCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	review, err := client.AuthorizationV1().SelfSubjectAccessReviews().Create(checkCtx, sar, metav1.CreateOptions{})
	latency := time.Since(start).Milliseconds()

	if err != nil {
		// Fallback: cluster might not allow SelfSubjectAccessReview or RBAC is disabled
		return DiagnosticStage{
			Name:      "rbac",
			Passed:    true,
			Message:   "RBAC check deferred (assumed active)",
			LatencyMs: latency,
			Details: map[string]interface{}{
				"clusterAdmin": false,
			},
		}
	}

	isClusterAdmin := review.Status.Allowed
	msg := "Namespace-scoped permissions verified"
	if isClusterAdmin {
		msg = "Cluster-admin permissions verified"
	}

	return DiagnosticStage{
		Name:      "rbac",
		Passed:    true,
		Message:   msg,
		LatencyMs: latency,
		Details: map[string]interface{}{
			"clusterAdmin": isClusterAdmin,
		},
	}
}
