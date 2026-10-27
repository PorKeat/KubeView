package cluster

import (
	"context"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"
)

// IngressPathSummary is a display-ready ingress rule path.
type IngressPathSummary struct {
	Host        string `json:"host,omitempty"`
	Path        string `json:"path"`
	PathType    string `json:"pathType"`
	ServiceName string `json:"serviceName,omitempty"`
	ServicePort string `json:"servicePort,omitempty"`
}

// IngressTLSSummary is a display-ready ingress TLS block.
type IngressTLSSummary struct {
	Hosts      []string `json:"hosts"`
	SecretName string   `json:"secretName,omitempty"`
	Status     string   `json:"status"`
	Subject    string   `json:"subject,omitempty"`
	Issuer     string   `json:"issuer,omitempty"`
	NotBefore  string   `json:"notBefore,omitempty"`
	NotAfter   string   `json:"notAfter,omitempty"`
	DNSNames   []string `json:"dnsNames,omitempty"`
	Message    string   `json:"message,omitempty"`
}

type tlsInspection struct {
	Status    string
	Subject   string
	Issuer    string
	NotBefore string
	NotAfter  string
	DNSNames  []string
	Message   string
}

// ApplyIngressParams carries a YAML manifest to create or update.
type ApplyIngressParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	YAML        string `json:"yaml"`
}

// DeleteIngressParams identifies an ingress to delete.
type DeleteIngressParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	Name        string `json:"name"`
}

// IngressSummary provides display-ready metadata for the ingress list.
type IngressSummary struct {
	Name              string               `json:"name"`
	Namespace         string               `json:"namespace"`
	ClassName         string               `json:"className,omitempty"`
	Status            string               `json:"status"`
	Hosts             []string             `json:"hosts"`
	Addresses         []string             `json:"addresses"`
	Paths             []IngressPathSummary `json:"paths"`
	TLS               []IngressTLSSummary  `json:"tls"`
	DefaultBackend    string               `json:"defaultBackend,omitempty"`
	Age               string               `json:"age"`
	CreationTimestamp string               `json:"creationTimestamp"`
	Labels            map[string]string    `json:"labels,omitempty"`
	Annotations       map[string]string    `json:"annotations,omitempty"`
}

// ListIngressesParams scopes an ingress list to a context and namespace.
type ListIngressesParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
}

// ListIngressesResult is the JSON-RPC payload for ingresses.list.
type ListIngressesResult struct {
	Items      []IngressSummary `json:"items"`
	TotalCount int              `json:"totalCount"`
}

// ListIngresses queries ingresses in the specified namespace (or all namespaces if empty / "all").
func (m *Manager) ListIngresses(ctx context.Context, contextName, namespace string) (*ListIngressesResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	ingressList, err := client.NetworkingV1().Ingresses(targetNs).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list ingresses: %w", err)
	}

	items := make([]IngressSummary, 0, len(ingressList.Items))
	tlsCache := make(map[string]tlsInspection)
	for i := range ingressList.Items {
		summary := convertIngressToSummary(&ingressList.Items[i])
		enrichIngressTLS(ctx, client, &summary, tlsCache)
		items = append(items, summary)
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Namespace == items[j].Namespace {
			return items[i].Name < items[j].Name
		}
		return items[i].Namespace < items[j].Namespace
	})

	return &ListIngressesResult{Items: items, TotalCount: len(items)}, nil
}

// convertIngressToSummary transforms a client-go Ingress into a UI-ready row.
func convertIngressToSummary(ingress *networkingv1.Ingress) IngressSummary {
	className := ""
	if ingress.Spec.IngressClassName != nil {
		className = *ingress.Spec.IngressClassName
	}
	if className == "" {
		className = ingress.Annotations["kubernetes.io/ingress.class"]
	}

	hosts := make([]string, 0)
	seenHosts := make(map[string]struct{})
	addHost := func(host string) {
		if host == "" {
			return
		}
		if _, exists := seenHosts[host]; exists {
			return
		}
		seenHosts[host] = struct{}{}
		hosts = append(hosts, host)
	}

	paths := make([]IngressPathSummary, 0)
	for _, rule := range ingress.Spec.Rules {
		addHost(rule.Host)
		if rule.HTTP == nil {
			continue
		}
		for _, path := range rule.HTTP.Paths {
			pathType := string(networkingv1.PathTypeImplementationSpecific)
			if path.PathType != nil {
				pathType = string(*path.PathType)
			}
			serviceName, servicePort := formatIngressBackend(path.Backend)
			paths = append(paths, IngressPathSummary{
				Host:        rule.Host,
				Path:        path.Path,
				PathType:    pathType,
				ServiceName: serviceName,
				ServicePort: servicePort,
			})
		}
	}

	tls := make([]IngressTLSSummary, 0, len(ingress.Spec.TLS))
	for _, tlsBlock := range ingress.Spec.TLS {
		tlsHosts := append([]string{}, tlsBlock.Hosts...)
		for _, host := range tlsHosts {
			addHost(host)
		}
		tls = append(tls, IngressTLSSummary{
			Hosts:      tlsHosts,
			SecretName: tlsBlock.SecretName,
		})
	}

	addresses := make([]string, 0, len(ingress.Status.LoadBalancer.Ingress))
	for _, address := range ingress.Status.LoadBalancer.Ingress {
		if address.IP != "" {
			addresses = append(addresses, address.IP)
		} else if address.Hostname != "" {
			addresses = append(addresses, address.Hostname)
		}
	}

	defaultBackend := ""
	if ingress.Spec.DefaultBackend != nil {
		serviceName, servicePort := formatIngressBackend(*ingress.Spec.DefaultBackend)
		defaultBackend = strings.TrimSpace(serviceName)
		if servicePort != "" {
			defaultBackend = fmt.Sprintf("%s:%s", defaultBackend, servicePort)
		}
	}

	status := "Pending"
	if len(addresses) > 0 {
		status = "Ready"
	}
	if ingress.DeletionTimestamp != nil {
		status = "Terminating"
	}

	creation := ""
	if !ingress.CreationTimestamp.IsZero() {
		creation = ingress.CreationTimestamp.Time.Format(time.RFC3339)
	}

	return IngressSummary{
		Name:              ingress.Name,
		Namespace:         ingress.Namespace,
		ClassName:         className,
		Status:            status,
		Hosts:             hosts,
		Addresses:         addresses,
		Paths:             paths,
		TLS:               tls,
		DefaultBackend:    defaultBackend,
		Age:               formatAge(time.Since(ingress.CreationTimestamp.Time)),
		CreationTimestamp: creation,
		Labels:            ingress.Labels,
		Annotations:       ingress.Annotations,
	}
}

func enrichIngressTLS(ctx context.Context, client kubernetes.Interface, summary *IngressSummary, cache map[string]tlsInspection) {
	for i := range summary.TLS {
		block := &summary.TLS[i]
		cacheKey := summary.Namespace + "/" + block.SecretName
		inspection, exists := cache[cacheKey]
		if !exists {
			inspection = inspectIngressTLSSecret(ctx, client, summary.Namespace, block.SecretName)
			cache[cacheKey] = inspection
		}
		block.Status = inspection.Status
		block.Subject = inspection.Subject
		block.Issuer = inspection.Issuer
		block.NotBefore = inspection.NotBefore
		block.NotAfter = inspection.NotAfter
		block.DNSNames = inspection.DNSNames
		block.Message = inspection.Message
	}
}

func inspectIngressTLSSecret(ctx context.Context, client kubernetes.Interface, namespace, secretName string) tlsInspection {
	if strings.TrimSpace(secretName) == "" {
		return tlsInspection{Status: "Missing", Message: "No TLS secret configured"}
	}

	secret, err := client.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return tlsInspection{Status: "Missing", Message: "TLS secret not found"}
	}
	if apierrors.IsForbidden(err) {
		return tlsInspection{Status: "Unreadable", Message: "RBAC denies reading this Secret"}
	}
	if err != nil {
		return tlsInspection{Status: "Unreadable", Message: err.Error()}
	}

	certificatePEM := secret.Data[corev1.TLSCertKey]
	if len(certificatePEM) == 0 {
		return tlsInspection{Status: "Invalid", Message: "Secret has no tls.crt entry"}
	}
	block, _ := pem.Decode(certificatePEM)
	if block == nil {
		return tlsInspection{Status: "Invalid", Message: "tls.crt is not valid PEM data"}
	}
	certificate, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return tlsInspection{Status: "Invalid", Message: fmt.Sprintf("tls.crt could not be parsed: %v", err)}
	}

	now := time.Now()
	status := "Valid"
	if now.After(certificate.NotAfter) {
		status = "Expired"
	} else if certificate.NotAfter.Before(now.Add(30 * 24 * time.Hour)) {
		status = "Expiring"
	}

	return tlsInspection{
		Status:    status,
		Subject:   certificate.Subject.String(),
		Issuer:    certificate.Issuer.String(),
		NotBefore: certificate.NotBefore.Format(time.RFC3339),
		NotAfter:  certificate.NotAfter.Format(time.RFC3339),
		DNSNames:  append([]string{}, certificate.DNSNames...),
	}
}

// ApplyIngressYaml creates or updates an Ingress from a YAML manifest.
func (m *Manager) ApplyIngressYaml(ctx context.Context, p ApplyIngressParams) (*IngressSummary, error) {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}

	var ingress networkingv1.Ingress
	if err := yaml.Unmarshal([]byte(p.YAML), &ingress); err != nil {
		return nil, fmt.Errorf("invalid YAML: %w", err)
	}
	if ingress.Kind != "" && ingress.Kind != "Ingress" {
		return nil, fmt.Errorf("expected kind Ingress, got %s", ingress.Kind)
	}
	if ingress.APIVersion != "" && ingress.APIVersion != "networking.k8s.io/v1" {
		return nil, fmt.Errorf("expected apiVersion networking.k8s.io/v1, got %s", ingress.APIVersion)
	}
	if ingress.Name == "" {
		return nil, fmt.Errorf("metadata.name is required")
	}

	targetNs := strings.TrimSpace(p.Namespace)
	if targetNs == "" || targetNs == "all" || targetNs == "Cluster Scope" {
		targetNs = ingress.Namespace
	}
	if targetNs == "" {
		targetNs = "default"
	}
	ingress.Namespace = targetNs

	var result *networkingv1.Ingress
	existing, getErr := client.NetworkingV1().Ingresses(targetNs).Get(ctx, ingress.Name, metav1.GetOptions{})
	if apierrors.IsNotFound(getErr) {
		result, err = client.NetworkingV1().Ingresses(targetNs).Create(ctx, &ingress, metav1.CreateOptions{FieldManager: "kubeview"})
	} else if getErr != nil {
		return nil, fmt.Errorf("failed to get ingress %s: %w", ingress.Name, getErr)
	} else {
		ingress.ResourceVersion = existing.ResourceVersion
		ingress.UID = existing.UID
		result, err = client.NetworkingV1().Ingresses(targetNs).Update(ctx, &ingress, metav1.UpdateOptions{FieldManager: "kubeview"})
	}
	if err != nil {
		return nil, fmt.Errorf("failed to apply ingress %s: %w", ingress.Name, err)
	}

	summary := convertIngressToSummary(result)
	enrichIngressTLS(ctx, client, &summary, make(map[string]tlsInspection))
	return &summary, nil
}

// DeleteIngress removes an ingress by name.
func (m *Manager) DeleteIngress(ctx context.Context, p DeleteIngressParams) error {
	client, _, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return err
	}
	err = client.NetworkingV1().Ingresses(p.Namespace).Delete(ctx, p.Name, metav1.DeleteOptions{})
	if apierrors.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to delete ingress %s: %w", p.Name, err)
	}
	return nil
}

func formatIngressBackend(backend networkingv1.IngressBackend) (string, string) {
	if backend.Service != nil {
		port := ""
		if backend.Service.Port.Name != "" {
			port = backend.Service.Port.Name
		} else if backend.Service.Port.Number != 0 {
			port = fmt.Sprintf("%d", backend.Service.Port.Number)
		}
		return backend.Service.Name, port
	}
	if backend.Resource != nil {
		return fmt.Sprintf("%s/%s", backend.Resource.Kind, backend.Resource.Name), ""
	}
	return "", ""
}

// GetIngressYaml exports the live Ingress manifest as YAML.
func (m *Manager) GetIngressYaml(ctx context.Context, contextName, namespace, ingressName string) (*PodYamlResult, error) {
	client, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	ingress, err := client.NetworkingV1().Ingresses(namespace).Get(ctx, ingressName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get ingress %s: %w", ingressName, err)
	}

	ingress.TypeMeta = metav1.TypeMeta{APIVersion: "networking.k8s.io/v1", Kind: "Ingress"}
	ingress.ManagedFields = nil

	data, err := yaml.Marshal(ingress)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal ingress to YAML: %w", err)
	}

	return &PodYamlResult{YAML: string(data)}, nil
}
