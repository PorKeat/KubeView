package cluster

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sfake "k8s.io/client-go/kubernetes/fake"
)

func generateTestCertificate(t *testing.T, notBefore, notAfter time.Time, dnsNames []string) []byte {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	commonName := "test"
	if len(dnsNames) > 0 {
		commonName = dnsNames[0]
	}
	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: commonName},
		DNSNames:     dnsNames,
		NotBefore:    notBefore,
		NotAfter:     notAfter,
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		t.Fatalf("failed to create certificate: %v", err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}

func TestListIngressesTLSStatus(t *testing.T) {
	validCert := generateTestCertificate(t, time.Now().Add(-time.Hour), time.Now().Add(90*24*time.Hour), []string{"app.example.com"})
	expiredCert := generateTestCertificate(t, time.Now().Add(-48*time.Hour), time.Now().Add(-24*time.Hour), []string{"expired.example.com"})

	validSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "valid-tls", Namespace: "production"},
		Data:       map[string][]byte{corev1.TLSCertKey: validCert},
	}
	expiredSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "expired-tls", Namespace: "production"},
		Data:       map[string][]byte{corev1.TLSCertKey: expiredCert},
	}
	ingress := &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "production"},
		Spec: networkingv1.IngressSpec{
			TLS: []networkingv1.IngressTLS{
				{Hosts: []string{"app.example.com"}, SecretName: "valid-tls"},
				{Hosts: []string{"expired.example.com"}, SecretName: "expired-tls"},
				{Hosts: []string{"missing.example.com"}, SecretName: "missing-tls"},
			},
		},
	}

	manager := newFakeManager(k8sfake.NewSimpleClientset(validSecret, expiredSecret, ingress))
	result, err := manager.ListIngresses(context.Background(), "test", "production")
	if err != nil {
		t.Fatalf("ListIngresses failed: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 ingress, got %d", len(result.Items))
	}
	tls := result.Items[0].TLS
	if len(tls) != 3 {
		t.Fatalf("expected 3 TLS blocks, got %d", len(tls))
	}
	if tls[0].Status != "Valid" {
		t.Errorf("expected Valid status, got %s", tls[0].Status)
	}
	if tls[0].Issuer == "" || tls[0].NotAfter == "" {
		t.Errorf("expected issuer and expiry, got %+v", tls[0])
	}
	if tls[1].Status != "Expired" {
		t.Errorf("expected Expired status, got %s", tls[1].Status)
	}
	if tls[2].Status != "Missing" {
		t.Errorf("expected Missing status, got %s", tls[2].Status)
	}
}

func TestApplyAndDeleteIngressYaml(t *testing.T) {
	manager := newFakeManager(k8sfake.NewSimpleClientset())
	manifest := `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: production
  labels:
    team: platform
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
`
	summary, err := manager.ApplyIngressYaml(context.Background(), ApplyIngressParams{
		ContextName: "test",
		Namespace:   "production",
		YAML:        manifest,
	})
	if err != nil {
		t.Fatalf("ApplyIngressYaml failed: %v", err)
	}
	if summary.Name != "web" || summary.Labels["team"] != "platform" {
		t.Errorf("unexpected applied ingress: %+v", summary)
	}
	if len(summary.Paths) != 1 || summary.Paths[0].ServiceName != "web" {
		t.Errorf("unexpected ingress paths: %+v", summary.Paths)
	}

	updatedManifest := `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: production
  labels:
    team: networking
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 8080
`
	updated, err := manager.ApplyIngressYaml(context.Background(), ApplyIngressParams{
		ContextName: "test",
		Namespace:   "production",
		YAML:        updatedManifest,
	})
	if err != nil {
		t.Fatalf("ApplyIngressYaml update failed: %v", err)
	}
	if updated.Labels["team"] != "networking" {
		t.Errorf("expected updated labels, got %+v", updated.Labels)
	}

	if err := manager.DeleteIngress(context.Background(), DeleteIngressParams{
		ContextName: "test",
		Namespace:   "production",
		Name:        "web",
	}); err != nil {
		t.Fatalf("DeleteIngress failed: %v", err)
	}

	result, err := manager.ListIngresses(context.Background(), "test", "production")
	if err != nil {
		t.Fatalf("ListIngresses after delete failed: %v", err)
	}
	if len(result.Items) != 0 {
		t.Errorf("expected no ingresses after delete, got %d", len(result.Items))
	}
}

func TestApplyIngressRejectsWrongKind(t *testing.T) {
	manager := newFakeManager(k8sfake.NewSimpleClientset())
	_, err := manager.ApplyIngressYaml(context.Background(), ApplyIngressParams{
		ContextName: "test",
		Namespace:   "production",
		YAML:        "apiVersion: v1\nkind: Service\nmetadata:\n  name: not-an-ingress\n",
	})
	if err == nil {
		t.Fatal("expected wrong-kind error")
	}
}
