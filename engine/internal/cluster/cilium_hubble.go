package cluster

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

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
