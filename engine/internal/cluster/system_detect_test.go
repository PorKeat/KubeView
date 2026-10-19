package cluster

import (
	"os"
	"path/filepath"
	"testing"

	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

func TestDetectSystemConfigs(t *testing.T) {
	// Create temporary mock kubeconfig
	tmpDir, err := os.MkdirTemp("", "kubeview_detect_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	mockConfig := clientcmdapi.NewConfig()
	mockConfig.Clusters["test-cluster"] = &clientcmdapi.Cluster{
		Server: "https://127.0.0.1:6443",
	}
	mockConfig.Contexts["test-context-1"] = &clientcmdapi.Context{
		Cluster: "test-cluster",
	}
	mockConfig.Contexts["test-context-2"] = &clientcmdapi.Context{
		Cluster: "test-cluster",
	}

	mockFilePath := filepath.Join(tmpDir, "kubeconfig")
	if err := clientcmd.WriteToFile(*mockConfig, mockFilePath); err != nil {
		t.Fatalf("failed to write mock config: %v", err)
	}

	// Set KUBECONFIG env var to point to mock file
	oldKubeconfig := os.Getenv("KUBECONFIG")
	os.Setenv("KUBECONFIG", mockFilePath)
	defer os.Setenv("KUBECONFIG", oldKubeconfig)

	mgr, err := NewManager("")
	if err != nil {
		t.Fatalf("NewManager failed: %v", err)
	}

	result, err := mgr.DetectSystemConfigs()
	if err != nil {
		t.Fatalf("DetectSystemConfigs failed: %v", err)
	}

	if len(result.Contexts) < 2 {
		t.Errorf("expected at least 2 contexts, got %d", len(result.Contexts))
	}

	foundCtx1 := false
	for _, c := range result.Contexts {
		if c.ContextName == "test-context-1" {
			foundCtx1 = true
			if c.Server != "https://127.0.0.1:6443" {
				t.Errorf("expected server https://127.0.0.1:6443, got %s", c.Server)
			}
		}
	}

	if !foundCtx1 {
		t.Errorf("expected test-context-1 to be discovered")
	}
}
