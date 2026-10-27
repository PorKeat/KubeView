package cluster

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/reflection/grpc_reflection_v1alpha"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protodesc"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/descriptorpb"
	"google.golang.org/protobuf/types/dynamicpb"
)

var (
	ciliumNetworkPolicyGVR = schema.GroupVersionResource{Group: "cilium.io", Version: "v2", Resource: "ciliumnetworkpolicies"}
	ciliumEndpointGVR      = schema.GroupVersionResource{Group: "cilium.io", Version: "v2", Resource: "ciliumendpoints"}
)

// CiliumStatus describes Cilium and Hubble availability.
type CiliumStatus struct {
	Installed          bool   `json:"installed"`
	Version            string `json:"version,omitempty"`
	NetworkPolicyCount int    `json:"networkPolicyCount"`
	EndpointCount      int    `json:"endpointCount"`
	HubbleAvailable    bool   `json:"hubbleAvailable"`
	HubbleRelayService string `json:"hubbleRelayService,omitempty"`
	HubbleRelayPort    int    `json:"hubbleRelayPort,omitempty"`
	Message            string `json:"message,omitempty"`
}

// CiliumNetworkPolicySummary is a display-ready CiliumNetworkPolicy row.
type CiliumNetworkPolicySummary struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	EndpointSelector  string            `json:"endpointSelector"`
	IngressRules      int               `json:"ingressRules"`
	EgressRules       int               `json:"egressRules"`
	Status            string            `json:"status"`
	Age               string            `json:"age"`
	CreationTimestamp string            `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

// CiliumEndpointSummary is a display-ready CiliumEndpoint row.
type CiliumEndpointSummary struct {
	Name              string `json:"name"`
	Namespace         string `json:"namespace"`
	PodName           string `json:"podName"`
	IdentityID        int64  `json:"identityId"`
	State             string `json:"state"`
	IPv4              string `json:"ipv4,omitempty"`
	IPv6              string `json:"ipv6,omitempty"`
	IngressPolicy     string `json:"ingressPolicy,omitempty"`
	EgressPolicy      string `json:"egressPolicy,omitempty"`
	Age               string `json:"age"`
	CreationTimestamp string `json:"creationTimestamp"`
}

// ListCiliumResourcesResult is returned by cilium.list.
type ListCiliumResourcesResult struct {
	Policies  []CiliumNetworkPolicySummary `json:"policies"`
	Endpoints []CiliumEndpointSummary      `json:"endpoints"`
	Status    CiliumStatus                 `json:"status"`
}

// ListHubbleFlowsParams scopes a Hubble flow query.
type ListHubbleFlowsParams struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	Number      int    `json:"number"`
}

// HubbleFlowSummary is a display-ready Hubble flow.
type HubbleFlowSummary struct {
	Time                 string `json:"time"`
	Verdict              string `json:"verdict"`
	Type                 string `json:"type"`
	SourceNamespace      string `json:"sourceNamespace,omitempty"`
	SourcePod            string `json:"sourcePod,omitempty"`
	SourceIP             string `json:"sourceIp,omitempty"`
	DestinationNamespace string `json:"destinationNamespace,omitempty"`
	DestinationPod       string `json:"destinationPod,omitempty"`
	DestinationIP        string `json:"destinationIp,omitempty"`
	Protocol             string `json:"protocol,omitempty"`
	SourcePort           string `json:"sourcePort,omitempty"`
	DestinationPort      string `json:"destinationPort,omitempty"`
	NodeName             string `json:"nodeName,omitempty"`
	DropReason           string `json:"dropReason,omitempty"`
	Summary              string `json:"summary"`
	RawJSON              string `json:"rawJson,omitempty"`
}

// ListHubbleFlowsResult is returned by cilium.hubbleFlows.
type ListHubbleFlowsResult struct {
	Flows []HubbleFlowSummary `json:"flows"`
}

// ListCiliumResources lists Cilium policies, endpoints and integration status.
func (m *Manager) ListCiliumResources(ctx context.Context, contextName, namespace string) (*ListCiliumResourcesResult, error) {
	dynamicClient, err := m.getDynamicClient(contextName)
	if err != nil {
		return nil, err
	}
	typedClient, _, err := m.GetClientForContext(contextName)
	if err != nil {
		return nil, err
	}

	targetNs := namespace
	if targetNs == "all" {
		targetNs = ""
	}

	policies := make([]CiliumNetworkPolicySummary, 0)
	endpoints := make([]CiliumEndpointSummary, 0)
	policiesAvailable := false
	endpointsAvailable := false

	if policyList, listErr := dynamicClient.Resource(ciliumNetworkPolicyGVR).Namespace(targetNs).List(ctx, metav1.ListOptions{}); listErr == nil {
		policiesAvailable = true
		for i := range policyList.Items {
			policies = append(policies, convertCiliumNetworkPolicy(&policyList.Items[i]))
		}
	}
	if endpointList, listErr := dynamicClient.Resource(ciliumEndpointGVR).Namespace(targetNs).List(ctx, metav1.ListOptions{}); listErr == nil {
		endpointsAvailable = true
		for i := range endpointList.Items {
			endpoints = append(endpoints, convertCiliumEndpoint(&endpointList.Items[i]))
		}
	}

	sort.Slice(policies, func(i, j int) bool {
		if policies[i].Namespace == policies[j].Namespace {
			return policies[i].Name < policies[j].Name
		}
		return policies[i].Namespace < policies[j].Namespace
	})
	sort.Slice(endpoints, func(i, j int) bool {
		if endpoints[i].Namespace == endpoints[j].Namespace {
			return endpoints[i].Name < endpoints[j].Name
		}
		return endpoints[i].Namespace < endpoints[j].Namespace
	})

	status := detectCiliumStatus(ctx, typedClient, policiesAvailable || endpointsAvailable, len(policies), len(endpoints))
	return &ListCiliumResourcesResult{Policies: policies, Endpoints: endpoints, Status: status}, nil
}

func detectCiliumStatus(ctx context.Context, client kubernetes.Interface, resourcesAvailable bool, policyCount, endpointCount int) CiliumStatus {
	status := CiliumStatus{
		Installed:          resourcesAvailable,
		NetworkPolicyCount: policyCount,
		EndpointCount:      endpointCount,
	}

	pods, err := client.CoreV1().Pods("kube-system").List(ctx, metav1.ListOptions{LabelSelector: "k8s-app=cilium"})
	if err == nil && len(pods.Items) > 0 {
		status.Installed = true
		status.Version = ciliumVersionFromPod(&pods.Items[0])
	}
	if !status.Installed {
		status.Message = "Cilium CRDs and agent pods were not detected."
		return status
	}

	relay, relayErr := client.CoreV1().Services("kube-system").Get(ctx, "hubble-relay", metav1.GetOptions{})
	if relayErr == nil {
		status.HubbleAvailable = true
		status.HubbleRelayService = "kube-system/hubble-relay"
		status.HubbleRelayPort = hubbleRelayPort(relay)
	} else {
		status.Message = "Cilium is installed but the hubble-relay Service was not found."
	}
	return status
}

func ciliumVersionFromPod(pod *corev1.Pod) string {
	for _, container := range pod.Spec.Containers {
		if container.Name != "cilium-agent" && container.Name != "cilium" {
			continue
		}
		image := container.Image
		if index := strings.LastIndex(image, ":"); index >= 0 && index > strings.LastIndex(image, "/") {
			return image[index+1:]
		}
		return image
	}
	if len(pod.Spec.Containers) > 0 {
		image := pod.Spec.Containers[0].Image
		if index := strings.LastIndex(image, ":"); index >= 0 && index > strings.LastIndex(image, "/") {
			return image[index+1:]
		}
	}
	return ""
}

func hubbleRelayPort(service *corev1.Service) int {
	for _, port := range service.Spec.Ports {
		if port.Name == "grpc" || port.Port == 4245 {
			return int(port.Port)
		}
	}
	if len(service.Spec.Ports) > 0 {
		return int(service.Spec.Ports[0].Port)
	}
	return 4245
}

func convertCiliumNetworkPolicy(policy *unstructured.Unstructured) CiliumNetworkPolicySummary {
	creation := ""
	if !policy.GetCreationTimestamp().Time.IsZero() {
		creation = policy.GetCreationTimestamp().Time.Format(time.RFC3339)
	}
	ingress, _, _ := unstructured.NestedSlice(policy.Object, "spec", "ingress")
	egress, _, _ := unstructured.NestedSlice(policy.Object, "spec", "egress")
	selectorMap, _, _ := unstructured.NestedStringMap(policy.Object, "spec", "endpointSelector", "matchLabels")
	selector := "all endpoints"
	if len(selectorMap) > 0 {
		selector = formatStringMapSelector(selectorMap)
	}
	status := "No Rules"
	if len(ingress)+len(egress) > 0 {
		status = "Enforcing"
	}
	return CiliumNetworkPolicySummary{
		Name:              policy.GetName(),
		Namespace:         policy.GetNamespace(),
		EndpointSelector:  selector,
		IngressRules:      len(ingress),
		EgressRules:       len(egress),
		Status:            status,
		Age:               formatAge(time.Since(policy.GetCreationTimestamp().Time)),
		CreationTimestamp: creation,
		Labels:            policy.GetLabels(),
		Annotations:       policy.GetAnnotations(),
	}
}

func convertCiliumEndpoint(endpoint *unstructured.Unstructured) CiliumEndpointSummary {
	creation := ""
	if !endpoint.GetCreationTimestamp().Time.IsZero() {
		creation = endpoint.GetCreationTimestamp().Time.Format(time.RFC3339)
	}
	identityID, _, _ := unstructured.NestedInt64(endpoint.Object, "status", "identity", "id")
	state, _, _ := unstructured.NestedString(endpoint.Object, "status", "state")
	podName, _, _ := unstructured.NestedString(endpoint.Object, "status", "external-identifiers", "pod-name")
	if podName == "" {
		podName = endpoint.GetName()
	}
	if slash := strings.LastIndex(podName, "/"); slash >= 0 {
		podName = podName[slash+1:]
	}
	addresses, _, _ := unstructured.NestedSlice(endpoint.Object, "status", "networking", "addressing")
	ipv4 := ""
	ipv6 := ""
	for _, address := range addresses {
		addressMap, ok := address.(map[string]interface{})
		if !ok {
			continue
		}
		if value, _, _ := unstructured.NestedString(addressMap, "ipv4"); value != "" {
			ipv4 = value
		}
		if value, _, _ := unstructured.NestedString(addressMap, "ipv6"); value != "" {
			ipv6 = value
		}
	}
	ingressPolicy, _, _ := unstructured.NestedBool(endpoint.Object, "status", "policy", "ingress", "enforcing")
	egressPolicy, _, _ := unstructured.NestedBool(endpoint.Object, "status", "policy", "egress", "enforcing")
	return CiliumEndpointSummary{
		Name:              endpoint.GetName(),
		Namespace:         endpoint.GetNamespace(),
		PodName:           podName,
		IdentityID:        identityID,
		State:             state,
		IPv4:              ipv4,
		IPv6:              ipv6,
		IngressPolicy:     enforcementLabel(ingressPolicy),
		EgressPolicy:      enforcementLabel(egressPolicy),
		Age:               formatAge(time.Since(endpoint.GetCreationTimestamp().Time)),
		CreationTimestamp: creation,
	}
}

func enforcementLabel(enforcing bool) string {
	if enforcing {
		return "Enforcing"
	}
	return "Off"
}

func formatStringMapSelector(values map[string]string) string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, key+"="+values[key])
	}
	return strings.Join(parts, ",")
}

// ListHubbleFlows reads the latest flows from hubble-relay via gRPC reflection.
func (m *Manager) ListHubbleFlows(ctx context.Context, p ListHubbleFlowsParams) (*ListHubbleFlowsResult, error) {
	typedClient, restConfig, err := m.GetClientForContext(p.ContextName)
	if err != nil {
		return nil, err
	}

	relayService, relayErr := typedClient.CoreV1().Services("kube-system").Get(ctx, "hubble-relay", metav1.GetOptions{})
	if relayErr != nil {
		return nil, fmt.Errorf("hubble-relay Service was not found in kube-system")
	}
	relayPort := hubbleRelayPort(relayService)
	relayPod, err := resolveServiceEndpointPod(ctx, typedClient, "kube-system", "hubble-relay")
	if err != nil {
		return nil, fmt.Errorf("hubble-relay has no ready endpoints: %w", err)
	}

	localPort, stop, err := startPodPortForward(typedClient, restConfig, "kube-system", relayPod, relayPort)
	if err != nil {
		return nil, fmt.Errorf("failed to port-forward to hubble-relay: %w", err)
	}
	defer stop()

	number := p.Number
	if number <= 0 {
		number = 50
	}
	if number > 500 {
		number = 500
	}

	flows, err := fetchHubbleFlows(ctx, localPort, number)
	if err != nil {
		return nil, err
	}
	return &ListHubbleFlowsResult{Flows: flows}, nil
}

func fetchHubbleFlows(ctx context.Context, localPort, number int) ([]HubbleFlowSummary, error) {
	connection, err := grpc.NewClient(
		fmt.Sprintf("127.0.0.1:%d", localPort),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Hubble gRPC client: %w", err)
	}
	defer connection.Close()

	files, err := fetchReflectionFiles(ctx, connection, "observer.Observer")
	if err != nil {
		return nil, err
	}
	serviceDescriptor, err := files.FindDescriptorByName("observer.Observer")
	if err != nil {
		return nil, fmt.Errorf("observer.Observer was not found in reflection data: %w", err)
	}
	service, ok := serviceDescriptor.(protoreflect.ServiceDescriptor)
	if !ok {
		return nil, fmt.Errorf("reflection descriptor for observer.Observer is not a service")
	}
	method := service.Methods().ByName("GetFlows")
	if method == nil {
		return nil, fmt.Errorf("observer.Observer does not expose GetFlows")
	}

	request := dynamicpb.NewMessage(method.Input())
	if field := method.Input().Fields().ByName("number"); field != nil {
		request.Set(field, protoreflect.ValueOfUint64(uint64(number)))
	}
	if field := method.Input().Fields().ByName("follow"); field != nil {
		request.Set(field, protoreflect.ValueOfBool(false))
	}

	stream, err := connection.NewStream(ctx, &grpc.StreamDesc{StreamName: "GetFlows", ServerStreams: true}, "/observer.Observer/GetFlows")
	if err != nil {
		return nil, fmt.Errorf("failed to open Hubble flow stream: %w", err)
	}
	if err := stream.SendMsg(request); err != nil {
		return nil, fmt.Errorf("failed to send Hubble flow request: %w", err)
	}
	if err := stream.CloseSend(); err != nil {
		return nil, fmt.Errorf("failed to finish Hubble flow request: %w", err)
	}

	flowField := method.Output().Fields().ByName("flow")
	flows := make([]HubbleFlowSummary, 0, number)
	for len(flows) < number {
		response := dynamicpb.NewMessage(method.Output())
		if err := stream.RecvMsg(response); err != nil {
			if len(flows) > 0 {
				break
			}
			return nil, fmt.Errorf("failed to receive Hubble flows: %w", err)
		}
		if flowField == nil || !response.Has(flowField) {
			continue
		}
		flowMessage := response.Get(flowField).Message().Interface()
		raw, err := protojson.Marshal(flowMessage)
		if err != nil {
			continue
		}
		var rawMap map[string]interface{}
		if err := json.Unmarshal(raw, &rawMap); err != nil {
			continue
		}
		flows = append(flows, summarizeHubbleFlow(rawMap, string(raw)))
	}
	return flows, nil
}

func fetchReflectionFiles(ctx context.Context, connection *grpc.ClientConn, symbol string) (*protoregistry.Files, error) {
	client := grpc_reflection_v1alpha.NewServerReflectionClient(connection)
	stream, err := client.ServerReflectionInfo(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to open gRPC reflection stream: %w", err)
	}
	request := &grpc_reflection_v1alpha.ServerReflectionRequest{
		MessageRequest: &grpc_reflection_v1alpha.ServerReflectionRequest_FileContainingSymbol{
			FileContainingSymbol: symbol,
		},
	}
	if err := stream.Send(request); err != nil {
		return nil, fmt.Errorf("failed to send reflection request: %w", err)
	}
	response, err := stream.Recv()
	if err != nil {
		return nil, fmt.Errorf("failed to receive reflection response: %w", err)
	}
	if errorResponse := response.GetErrorResponse(); errorResponse != nil {
		return nil, fmt.Errorf("gRPC reflection error: %s", errorResponse.ErrorMessage)
	}
	descriptorResponse := response.GetFileDescriptorResponse()
	if descriptorResponse == nil {
		return nil, fmt.Errorf("gRPC reflection returned no file descriptors")
	}

	descriptorSet := &descriptorpb.FileDescriptorSet{}
	for _, raw := range descriptorResponse.FileDescriptorProto {
		fileDescriptor := &descriptorpb.FileDescriptorProto{}
		if err := proto.Unmarshal(raw, fileDescriptor); err != nil {
			return nil, fmt.Errorf("failed to parse reflection descriptor: %w", err)
		}
		descriptorSet.File = append(descriptorSet.File, fileDescriptor)
	}
	files, err := protodesc.NewFiles(descriptorSet)
	if err != nil {
		return nil, fmt.Errorf("failed to build reflection descriptors: %w", err)
	}
	return files, nil
}

func summarizeHubbleFlow(flow map[string]interface{}, raw string) HubbleFlowSummary {
	source := nestedMap(flow, "source")
	destination := nestedMap(flow, "destination")
	ip := nestedMap(flow, "IP")
	l4 := nestedMap(flow, "l4")

	protocol := ""
	sourcePort := ""
	destinationPort := ""
	for _, name := range []string{"TCP", "UDP", "SCTP"} {
		if layer := nestedMap(l4, name); len(layer) > 0 {
			protocol = name
			sourcePort = nestedString(layer, "sourcePort")
			destinationPort = nestedString(layer, "destinationPort")
			break
		}
	}

	summary := HubbleFlowSummary{
		Time:                 nestedString(flow, "time"),
		Verdict:              nestedString(flow, "verdict"),
		Type:                 nestedString(flow, "type"),
		SourceNamespace:      nestedString(source, "namespace"),
		SourcePod:            nestedString(source, "podName"),
		SourceIP:             nestedString(ip, "source"),
		DestinationNamespace: nestedString(destination, "namespace"),
		DestinationPod:       nestedString(destination, "podName"),
		DestinationIP:        nestedString(ip, "destination"),
		Protocol:             protocol,
		SourcePort:           sourcePort,
		DestinationPort:      destinationPort,
		NodeName:             nestedString(flow, "nodeName"),
		DropReason:           nestedString(flow, "dropReasonDesc"),
		RawJSON:              raw,
	}

	sourceLabel := firstNonEmpty(summary.SourcePod, summary.SourceIP, "?")
	destinationLabel := firstNonEmpty(summary.DestinationPod, summary.DestinationIP, "?")
	summary.Summary = fmt.Sprintf("%s -> %s %s", sourceLabel, destinationLabel, firstNonEmpty(summary.Verdict, summary.Type, "flow"))
	if protocol != "" {
		summary.Summary += fmt.Sprintf(" %s/%s", protocol, firstNonEmpty(destinationPort, sourcePort, "?"))
	}
	return summary
}

func nestedMap(value map[string]interface{}, key string) map[string]interface{} {
	if value == nil {
		return nil
	}
	result, _ := value[key].(map[string]interface{})
	return result
}

func nestedString(value map[string]interface{}, key string) string {
	if value == nil {
		return ""
	}
	switch typed := value[key].(type) {
	case string:
		return typed
	case float64:
		return fmt.Sprintf("%.0f", typed)
	default:
		return ""
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
