package cluster

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"k8s.io/client-go/tools/clientcmd"
)

const sampleKubeconfig = `
apiVersion: v1
clusters:
- cluster:
    server: https://127.0.0.1:6443
    certificate-authority-data: c29tZS1jYS1kYXRh
  name: kind-kubeview
- cluster:
    server: https://A1B2C3D4.gr7.us-east-1.eks.amazonaws.com
  name: arn:aws:eks:us-east-1:123456789012:cluster/prod
contexts:
- context:
    cluster: kind-kubeview
    user: kind-kubeview
    namespace: kube-system
  name: kind-kubeview
- context:
    cluster: arn:aws:eks:us-east-1:123456789012:cluster/prod
    user: eks-admin
    namespace: production
  name: eks-prod
current-context: kind-kubeview
kind: Config
preferences: {}
users:
- name: kind-kubeview
  user:
    client-certificate-data: c29tZS1jZXJ0
    client-key-data: c29tZS1rZXk=
- name: eks-admin
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: aws
      args: ["eks", "get-token", "--cluster-name", "prod"]
`

func TestManagerLoadAndListContexts(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "kubeview-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	configPath := filepath.Join(tmpDir, "config")
	if err := os.WriteFile(configPath, []byte(sampleKubeconfig), 0600); err != nil {
		t.Fatalf("Failed to write test kubeconfig: %v", err)
	}

	mgr, err := NewManager(configPath)
	if err != nil {
		t.Fatalf("NewManager failed: %v", err)
	}

	result, err := mgr.ListContexts()
	if err != nil {
		t.Fatalf("ListContexts failed: %v", err)
	}

	if result.CurrentContext != "kind-kubeview" {
		t.Errorf("Expected current context kind-kubeview, got: %s", result.CurrentContext)
	}

	if len(result.Contexts) != 2 {
		t.Fatalf("Expected 2 contexts, got %d", len(result.Contexts))
	}

	var kindCtx, eksCtx *ContextSummary
	for i := range result.Contexts {
		if result.Contexts[i].Name == "kind-kubeview" {
			kindCtx = &result.Contexts[i]
		}
		if result.Contexts[i].Name == "eks-prod" {
			eksCtx = &result.Contexts[i]
		}
	}

	if kindCtx == nil || eksCtx == nil {
		t.Fatalf("Missing expected context summary")
	}

	if kindCtx.Provider != ProviderKind {
		t.Errorf("Expected kind provider, got: %s", kindCtx.Provider)
	}
	if kindCtx.AuthType != AuthCert {
		t.Errorf("Expected cert auth, got: %s", kindCtx.AuthType)
	}
	if kindCtx.Namespace != "kube-system" {
		t.Errorf("Expected namespace kube-system, got: %s", kindCtx.Namespace)
	}

	if eksCtx.Provider != ProviderEKS {
		t.Errorf("Expected eks provider, got: %s", eksCtx.Provider)
	}
	if eksCtx.AuthType != AuthExec {
		t.Errorf("Expected exec auth, got: %s", eksCtx.AuthType)
	}

	// Test SwitchContext
	switchRes, err := mgr.SwitchContext("eks-prod")
	if err != nil {
		t.Fatalf("SwitchContext failed: %v", err)
	}

	if switchRes.ActiveContext != "eks-prod" {
		t.Errorf("Expected active context eks-prod, got: %s", switchRes.ActiveContext)
	}
}

func TestManagerExportKubeconfig(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config")
	if err := os.WriteFile(configPath, []byte(sampleKubeconfig), 0600); err != nil {
		t.Fatalf("Failed to write test kubeconfig: %v", err)
	}

	mgr, err := NewManager(configPath)
	if err != nil {
		t.Fatalf("NewManager failed: %v", err)
	}

	result, err := mgr.ExportKubeconfig("eks-prod")
	if err != nil {
		t.Fatalf("ExportKubeconfig failed: %v", err)
	}
	if result.FileName != "eks-prod.kubeconfig" {
		t.Errorf("Expected eks-prod.kubeconfig, got %q", result.FileName)
	}
	if strings.Contains(result.YAML, "kind-kubeview") {
		t.Errorf("Export should not contain unrelated contexts")
	}

	exported, err := clientcmd.Load([]byte(result.YAML))
	if err != nil {
		t.Fatalf("Exported kubeconfig did not parse: %v", err)
	}
	if exported.CurrentContext != "eks-prod" {
		t.Errorf("Expected current context eks-prod, got %q", exported.CurrentContext)
	}
	if len(exported.Contexts) != 1 || exported.Contexts["eks-prod"] == nil {
		t.Fatalf("Expected exactly the eks-prod context: %#v", exported.Contexts)
	}
	if len(exported.Clusters) != 1 {
		t.Fatalf("Expected exactly one cluster, got %d", len(exported.Clusters))
	}
	cluster := exported.Clusters[exported.Contexts["eks-prod"].Cluster]
	if cluster == nil || cluster.Server != "https://A1B2C3D4.gr7.us-east-1.eks.amazonaws.com" {
		t.Fatalf("Unexpected exported cluster: %#v", cluster)
	}
	if len(exported.AuthInfos) != 1 {
		t.Fatalf("Expected exactly one user, got %d", len(exported.AuthInfos))
	}
	authInfo := exported.AuthInfos[exported.Contexts["eks-prod"].AuthInfo]
	if authInfo == nil || authInfo.Exec == nil || authInfo.Exec.Command != "aws" {
		t.Fatalf("Unexpected exported auth info: %#v", authInfo)
	}
}

func TestManagerUpdateKubeconfigContext(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config")
	if err := os.WriteFile(configPath, []byte(sampleKubeconfig), 0600); err != nil {
		t.Fatalf("Failed to write test kubeconfig: %v", err)
	}

	mgr, err := NewManager(configPath)
	if err != nil {
		t.Fatalf("NewManager failed: %v", err)
	}

	exported, err := mgr.ExportKubeconfig("eks-prod")
	if err != nil {
		t.Fatalf("ExportKubeconfig failed: %v", err)
	}
	updatedYAML := strings.Replace(
		exported.YAML,
		"namespace: production",
		"namespace: platform",
		1,
	)
	updatedYAML = strings.Replace(
		updatedYAML,
		"https://A1B2C3D4.gr7.us-east-1.eks.amazonaws.com",
		"https://new.example:6443",
		1,
	)

	result, err := mgr.UpdateKubeconfigContext("eks-prod", updatedYAML)
	if err != nil {
		t.Fatalf("UpdateKubeconfigContext failed: %v", err)
	}
	if result.ContextName != "eks-prod" {
		t.Fatalf("Unexpected context name: %q", result.ContextName)
	}

	reloaded, err := mgr.ExportKubeconfig("eks-prod")
	if err != nil {
		t.Fatalf("Reloaded export failed: %v", err)
	}
	config, err := clientcmd.Load([]byte(reloaded.YAML))
	if err != nil {
		t.Fatalf("Reloaded YAML did not parse: %v", err)
	}
	if config.Contexts["eks-prod"].Namespace != "platform" {
		t.Fatalf(
			"Expected updated namespace, got %q",
			config.Contexts["eks-prod"].Namespace,
		)
	}
	cluster := config.Clusters[config.Contexts["eks-prod"].Cluster]
	if cluster == nil || cluster.Server != "https://new.example:6443" {
		t.Fatalf("Unexpected updated cluster: %#v", cluster)
	}

	contexts, err := mgr.ListContexts()
	if err != nil {
		t.Fatalf("ListContexts failed: %v", err)
	}
	if len(contexts.Contexts) != 2 {
		t.Fatalf("Expected both contexts to remain, got %d", len(contexts.Contexts))
	}
}
