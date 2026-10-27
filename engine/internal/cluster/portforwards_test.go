package cluster

import (
	"context"
	"io"
	"net"
	"strconv"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	k8sfake "k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/rest"
)

func withEchoPortForward(t *testing.T, objects ...runtime.Object) *Manager {
	t.Helper()
	original := startPodPortForward
	t.Cleanup(func() {
		startPodPortForward = original
	})
	startPodPortForward = func(client kubernetes.Interface, restConfig *rest.Config, namespace, podName string, remotePort int) (int, func(), error) {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return 0, nil, err
		}
		go func() {
			for {
				connection, err := listener.Accept()
				if err != nil {
					return
				}
				go func(conn net.Conn) {
					defer conn.Close()
					_, _ = io.Copy(conn, conn)
				}(connection)
			}
		}()
		return listener.Addr().(*net.TCPAddr).Port, func() { _ = listener.Close() }, nil
	}
	return newFakeManager(k8sfake.NewSimpleClientset(objects...))
}

func testRunningPod(name, namespace string) *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Status:     corev1.PodStatus{Phase: corev1.PodRunning},
	}
}

func TestStartPortForwardCountsConnections(t *testing.T) {
	manager := withEchoPortForward(t, testRunningPod("web", "default"))
	ctx := context.Background()
	session, err := manager.StartPortForward(ctx, PortForwardRequest{
		ContextName: "test",
		Namespace:   "default",
		TargetKind:  "pod",
		TargetName:  "web",
		RemotePort:  8080,
	})
	if err != nil {
		t.Fatalf("StartPortForward failed: %v", err)
	}
	if session.LocalPort == 0 || session.Status != "active" {
		t.Fatalf("unexpected session: %+v", session)
	}

	connection, err := net.Dial("tcp", net.JoinHostPort(session.Address, strconv.Itoa(session.LocalPort)))
	if err != nil {
		t.Fatalf("failed to connect to forwarded port: %v", err)
	}
	payload := []byte("hello-forward")
	if _, err := connection.Write(payload); err != nil {
		t.Fatalf("failed to write payload: %v", err)
	}
	response := make([]byte, len(payload))
	_ = connection.SetReadDeadline(time.Now().Add(2 * time.Second))
	if _, err := io.ReadFull(connection, response); err != nil {
		t.Fatalf("failed to read echoed payload: %v", err)
	}
	if string(response) != string(payload) {
		t.Errorf("unexpected echoed payload: %q", response)
	}
	_ = connection.Close()

	deadline := time.Now().Add(3 * time.Second)
	for {
		list, listErr := manager.ListPortForwards(ctx)
		if listErr != nil {
			t.Fatalf("ListPortForwards failed: %v", listErr)
		}
		if len(list.Items) == 1 {
			item := list.Items[0]
			if item.TotalConnections == 1 &&
				item.ActiveConnections == 0 &&
				item.BytesSent >= int64(len(payload)) &&
				item.BytesReceived >= int64(len(payload)) {
				break
			}
		}
		if time.Now().After(deadline) {
			t.Fatalf("port forward counters did not update: %+v", list.Items)
		}
		time.Sleep(10 * time.Millisecond)
	}

	stopped, err := manager.StopPortForward(ctx, session.ID)
	if err != nil {
		t.Fatalf("StopPortForward failed: %v", err)
	}
	if stopped.Status != "stopped" {
		t.Errorf("expected stopped status, got %s", stopped.Status)
	}
	if _, err := manager.StopPortForward(ctx, "missing"); err == nil {
		t.Fatal("expected missing port forward error")
	}
}

func TestStartPortForwardFromServiceResolvesEndpointPod(t *testing.T) {
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "default"},
		Spec: corev1.ServiceSpec{
			Ports: []corev1.ServicePort{
				{Name: "http", Port: 80, TargetPort: intstrFromInt(8080)},
			},
		},
	}
	endpoints := &corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{Name: "web", Namespace: "default"},
		Subsets: []corev1.EndpointSubset{
			{Addresses: []corev1.EndpointAddress{{IP: "10.0.0.2", TargetRef: &corev1.ObjectReference{Kind: "Pod", Name: "web"}}}},
		},
	}
	manager := withEchoPortForward(t, testRunningPod("web", "default"), service, endpoints)
	session, err := manager.StartPortForward(context.Background(), PortForwardRequest{
		ContextName: "test",
		Namespace:   "default",
		TargetKind:  "service",
		TargetName:  "web",
	})
	if err != nil {
		t.Fatalf("StartPortForward for service failed: %v", err)
	}
	if session.TargetPod != "web" || session.RemotePort != 8080 {
		t.Errorf("unexpected service session: %+v", session)
	}
	_, _ = manager.StopPortForward(context.Background(), session.ID)
}

func TestStartPortForwardValidation(t *testing.T) {
	manager := withEchoPortForward(t, testRunningPod("web", "default"))
	ctx := context.Background()

	if _, err := manager.StartPortForward(ctx, PortForwardRequest{Namespace: "default", TargetKind: "pod", TargetName: "web", RemotePort: 8080, Address: "0.0.0.0"}); err == nil {
		t.Error("expected non-loopback address to be rejected")
	}
	if _, err := manager.StartPortForward(ctx, PortForwardRequest{Namespace: "default", TargetKind: "invalid", TargetName: "web", RemotePort: 8080}); err == nil {
		t.Error("expected invalid target kind to be rejected")
	}
	if _, err := manager.StartPortForward(ctx, PortForwardRequest{TargetKind: "pod", TargetName: "web", RemotePort: 8080}); err == nil {
		t.Error("expected missing namespace to be rejected")
	}
	if _, err := manager.StartPortForward(ctx, PortForwardRequest{Namespace: "default", TargetKind: "pod", TargetName: "web"}); err == nil {
		t.Error("expected missing remote port for pod target to be rejected")
	}
}
