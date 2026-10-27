package cluster

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

// PortForwardRequest starts a loopback TCP forward to a pod or service.
type PortForwardRequest struct {
	ContextName string `json:"contextName"`
	Namespace   string `json:"namespace"`
	TargetKind  string `json:"targetKind"` // service or pod
	TargetName  string `json:"targetName"`
	RemotePort  int    `json:"remotePort"`
	LocalPort   int    `json:"localPort"`
	Address     string `json:"address,omitempty"`
}

// PortForwardSession is a display-ready active or stopped forward.
type PortForwardSession struct {
	ID                string `json:"id"`
	ContextName       string `json:"contextName"`
	Namespace         string `json:"namespace"`
	TargetKind        string `json:"targetKind"`
	TargetName        string `json:"targetName"`
	TargetPod         string `json:"targetPod"`
	RemotePort        int    `json:"remotePort"`
	LocalPort         int    `json:"localPort"`
	Address           string `json:"address"`
	Status            string `json:"status"`
	StartedAt         string `json:"startedAt"`
	ActiveConnections int    `json:"activeConnections"`
	TotalConnections  int64  `json:"totalConnections"`
	BytesSent         int64  `json:"bytesSent"`
	BytesReceived     int64  `json:"bytesReceived"`
	LastError         string `json:"lastError,omitempty"`
}

// ListPortForwardsResult is returned by portforwards.list.
type ListPortForwardsResult struct {
	Items []PortForwardSession `json:"items"`
}

type portForwardSession struct {
	listener     net.Listener
	stopUpstream func()
	stopOnce     sync.Once
	mu           sync.Mutex
	info         PortForwardSession
	active       map[net.Conn]struct{}
}

// startPodPortForward is replaceable in tests to avoid a real SPDY server.
var startPodPortForward = realStartPodPortForward

func realStartPodPortForward(client kubernetes.Interface, restConfig *rest.Config, namespace, podName string, remotePort int) (int, func(), error) {
	request := client.CoreV1().RESTClient().Post().Resource("pods").Namespace(namespace).Name(podName).SubResource("portforward")
	transport, upgrader, err := spdy.RoundTripperFor(restConfig)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to prepare SPDY transport: %w", err)
	}
	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, http.MethodPost, request.URL())

	stopChan := make(chan struct{})
	readyChan := make(chan struct{})
	forwarder, err := portforward.NewOnAddresses(
		dialer,
		[]string{"127.0.0.1"},
		[]string{fmt.Sprintf("0:%d", remotePort)},
		stopChan,
		readyChan,
		io.Discard,
		io.Discard,
	)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to create port forwarder: %w", err)
	}

	errChan := make(chan error, 1)
	go func() {
		errChan <- forwarder.ForwardPorts()
	}()

	select {
	case <-readyChan:
	case forwardErr := <-errChan:
		close(stopChan)
		if forwardErr == nil {
			forwardErr = fmt.Errorf("port forward stopped before it was ready")
		}
		return 0, nil, forwardErr
	case <-time.After(15 * time.Second):
		close(stopChan)
		return 0, nil, fmt.Errorf("timed out waiting for the port forward to become ready")
	}

	ports, err := forwarder.GetPorts()
	if err != nil || len(ports) == 0 {
		close(stopChan)
		if err == nil {
			err = fmt.Errorf("forwarder returned no local ports")
		}
		return 0, nil, err
	}

	var stopOnce sync.Once
	stop := func() {
		stopOnce.Do(func() {
			close(stopChan)
		})
	}
	return int(ports[0].Local), stop, nil
}

// StartPortForward opens a loopback listener and proxies connections to a pod port.
func (m *Manager) StartPortForward(ctx context.Context, request PortForwardRequest) (*PortForwardSession, error) {
	namespace := strings.TrimSpace(request.Namespace)
	if namespace == "" || namespace == "all" {
		return nil, fmt.Errorf("namespace is required")
	}
	targetKind := strings.ToLower(strings.TrimSpace(request.TargetKind))
	if targetKind == "" {
		targetKind = "service"
	}
	if targetKind != "service" && targetKind != "pod" {
		return nil, fmt.Errorf("targetKind must be service or pod")
	}
	targetName := strings.TrimSpace(request.TargetName)
	if targetName == "" {
		return nil, fmt.Errorf("targetName is required")
	}
	address := strings.TrimSpace(request.Address)
	if address == "" {
		address = "127.0.0.1"
	}
	if address == "localhost" {
		address = "127.0.0.1"
	}
	if address != "127.0.0.1" && address != "::1" {
		return nil, fmt.Errorf("only loopback addresses are supported")
	}
	if request.LocalPort < 0 || request.LocalPort > 65535 {
		return nil, fmt.Errorf("localPort must be between 0 and 65535")
	}

	client, restConfig, err := m.GetClientForContext(request.ContextName)
	if err != nil {
		return nil, err
	}

	remotePort := request.RemotePort
	targetPod := targetName
	switch targetKind {
	case "pod":
		pod, podErr := client.CoreV1().Pods(namespace).Get(ctx, targetName, metav1.GetOptions{})
		if podErr != nil {
			return nil, fmt.Errorf("failed to get pod %s: %w", targetName, podErr)
		}
		if pod.Status.Phase != corev1.PodRunning {
			return nil, fmt.Errorf("pod %s is not Running", targetName)
		}
		if remotePort == 0 {
			return nil, fmt.Errorf("remotePort is required for pod targets")
		}
	case "service":
		service, serviceErr := client.CoreV1().Services(namespace).Get(ctx, targetName, metav1.GetOptions{})
		if serviceErr != nil {
			return nil, fmt.Errorf("failed to get service %s: %w", targetName, serviceErr)
		}
		servicePod, podErr := resolveServiceEndpointPod(ctx, client, namespace, targetName)
		if podErr != nil {
			return nil, podErr
		}
		targetPod = servicePod
		if remotePort == 0 {
			pod, getErr := client.CoreV1().Pods(namespace).Get(ctx, targetPod, metav1.GetOptions{})
			if getErr != nil {
				return nil, fmt.Errorf("failed to get target pod %s: %w", targetPod, getErr)
			}
			remotePort = resolveServicePodPort(service, pod)
			if remotePort == 0 {
				return nil, fmt.Errorf("could not determine a remote port for service %s", targetName)
			}
		}
	}

	if remotePort <= 0 || remotePort > 65535 {
		return nil, fmt.Errorf("remotePort must be between 1 and 65535")
	}

	upstreamPort, stopUpstream, err := startPodPortForward(client, restConfig, namespace, targetPod, remotePort)
	if err != nil {
		return nil, err
	}

	listener, err := net.Listen("tcp", net.JoinHostPort(address, strconv.Itoa(request.LocalPort)))
	if err != nil {
		stopUpstream()
		return nil, fmt.Errorf("failed to listen on %s:%d: %w", address, request.LocalPort, err)
	}

	actualLocalPort := listener.Addr().(*net.TCPAddr).Port
	session := &portForwardSession{
		listener:     listener,
		stopUpstream: stopUpstream,
		active:       make(map[net.Conn]struct{}),
		info: PortForwardSession{
			ID:          newPortForwardID(),
			ContextName: request.ContextName,
			Namespace:   namespace,
			TargetKind:  targetKind,
			TargetName:  targetName,
			TargetPod:   targetPod,
			RemotePort:  remotePort,
			LocalPort:   actualLocalPort,
			Address:     address,
			Status:      "active",
			StartedAt:   time.Now().Format(time.RFC3339),
		},
	}

	m.forwardsMu.Lock()
	if m.forwards == nil {
		m.forwards = make(map[string]*portForwardSession)
	}
	m.forwards[session.info.ID] = session
	m.forwardsMu.Unlock()

	go session.acceptLoop(upstreamPort)
	return session.snapshot(), nil
}

// ListPortForwards returns all sessions, active first.
func (m *Manager) ListPortForwards(_ context.Context) (*ListPortForwardsResult, error) {
	m.forwardsMu.Lock()
	sessions := make([]*portForwardSession, 0, len(m.forwards))
	for _, session := range m.forwards {
		sessions = append(sessions, session)
	}
	m.forwardsMu.Unlock()

	items := make([]PortForwardSession, 0, len(sessions))
	for _, session := range sessions {
		items = append(items, *session.snapshot())
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Status != items[j].Status {
			return items[i].Status == "active"
		}
		return items[i].StartedAt > items[j].StartedAt
	})
	return &ListPortForwardsResult{Items: items}, nil
}

// StopPortForward closes a forward and all of its active connections.
func (m *Manager) StopPortForward(_ context.Context, id string) (*PortForwardSession, error) {
	m.forwardsMu.Lock()
	session, exists := m.forwards[id]
	m.forwardsMu.Unlock()
	if !exists {
		return nil, fmt.Errorf("port forward %s not found", id)
	}
	session.stop()
	return session.snapshot(), nil
}

// StopAllPortForwards closes every forwarding session.
func (m *Manager) StopAllPortForwards() {
	m.forwardsMu.Lock()
	sessions := make([]*portForwardSession, 0, len(m.forwards))
	for _, session := range m.forwards {
		sessions = append(sessions, session)
	}
	m.forwardsMu.Unlock()
	for _, session := range sessions {
		session.stop()
	}
}

func (s *portForwardSession) acceptLoop(upstreamPort int) {
	for {
		conn, err := s.listener.Accept()
		if err != nil {
			return
		}
		go s.handleConnection(conn, upstreamPort)
	}
}

func (s *portForwardSession) handleConnection(conn net.Conn, upstreamPort int) {
	upstream, err := net.DialTimeout("tcp", net.JoinHostPort("127.0.0.1", strconv.Itoa(upstreamPort)), 5*time.Second)
	if err != nil {
		s.setError(err)
		_ = conn.Close()
		return
	}

	s.mu.Lock()
	s.active[conn] = struct{}{}
	s.info.ActiveConnections++
	s.info.TotalConnections++
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.active, conn)
		s.info.ActiveConnections--
		s.mu.Unlock()
		_ = conn.Close()
		_ = upstream.Close()
	}()

	var wait sync.WaitGroup
	wait.Add(2)
	go func() {
		defer wait.Done()
		_, _ = io.Copy(countingWriter{w: upstream, session: s, sent: true}, conn)
		closeWrite(upstream)
	}()
	go func() {
		defer wait.Done()
		_, _ = io.Copy(countingWriter{w: conn, session: s, sent: false}, upstream)
		closeWrite(conn)
	}()
	wait.Wait()
}

func (s *portForwardSession) stop() {
	s.stopOnce.Do(func() {
		s.mu.Lock()
		s.info.Status = "stopped"
		s.mu.Unlock()
		if s.listener != nil {
			_ = s.listener.Close()
		}
		if s.stopUpstream != nil {
			s.stopUpstream()
		}
		s.mu.Lock()
		for conn := range s.active {
			_ = conn.Close()
		}
		s.mu.Unlock()
	})
}

func (s *portForwardSession) snapshot() *PortForwardSession {
	s.mu.Lock()
	defer s.mu.Unlock()
	copy := s.info
	return &copy
}

func (s *portForwardSession) setError(err error) {
	s.mu.Lock()
	s.info.LastError = err.Error()
	s.mu.Unlock()
}

type countingWriter struct {
	w       io.Writer
	session *portForwardSession
	sent    bool
}

func (w countingWriter) Write(p []byte) (int, error) {
	n, err := w.w.Write(p)
	if n > 0 {
		w.session.mu.Lock()
		if w.sent {
			w.session.info.BytesSent += int64(n)
		} else {
			w.session.info.BytesReceived += int64(n)
		}
		w.session.mu.Unlock()
	}
	return n, err
}

func closeWrite(conn net.Conn) {
	type closeWriter interface {
		CloseWrite() error
	}
	if closer, ok := conn.(closeWriter); ok {
		_ = closer.CloseWrite()
		return
	}
	_ = conn.Close()
}

func resolveServiceEndpointPod(ctx context.Context, client kubernetes.Interface, namespace, serviceName string) (string, error) {
	endpoints, err := client.CoreV1().Endpoints(namespace).Get(ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to read endpoints for service %s: %w", serviceName, err)
	}
	for _, subset := range endpoints.Subsets {
		for _, address := range subset.Addresses {
			if address.TargetRef != nil && address.TargetRef.Kind == "Pod" && address.TargetRef.Name != "" {
				return address.TargetRef.Name, nil
			}
		}
	}
	return "", fmt.Errorf("service %s has no ready pod endpoints", serviceName)
}

func resolveServicePodPort(service *corev1.Service, pod *corev1.Pod) int {
	if service == nil || len(service.Spec.Ports) == 0 {
		return 0
	}
	servicePort := service.Spec.Ports[0]
	target := servicePort.TargetPort
	if target.IntVal > 0 {
		return int(target.IntVal)
	}
	if target.StrVal != "" {
		for _, container := range pod.Spec.Containers {
			for _, port := range container.Ports {
				if port.Name == target.StrVal {
					return int(port.ContainerPort)
				}
			}
		}
		return 0
	}
	return int(servicePort.Port)
}

func newPortForwardID() string {
	buffer := make([]byte, 4)
	if _, err := rand.Read(buffer); err != nil {
		return fmt.Sprintf("pf-%d", time.Now().UnixNano())
	}
	return "pf-" + hex.EncodeToString(buffer)
}
