package stream

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/kubeview/engine/internal/cluster"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/remotecommand"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow local connections from Tauri/Next.js
	},
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
}

type StreamServer struct {
	mu          sync.RWMutex
	mgr         *cluster.Manager
	logger      *log.Logger
	listener    net.Listener
	port        int
	server      *http.Server
	subMu       sync.RWMutex
	subscribers map[chan string]struct{}
}

func NewStreamServer(mgr *cluster.Manager) *StreamServer {
	return &StreamServer{
		mgr:         mgr,
		logger:      log.New(os.Stderr, "[stream-server] ", log.LstdFlags|log.Lmicroseconds),
		subscribers: make(map[chan string]struct{}),
	}
}

// Start binds an ephemeral port on 127.0.0.1 and starts the HTTP/SSE/WebSocket server
func (s *StreamServer) Start(bindAddr string) error {
	if bindAddr == "" {
		bindAddr = "127.0.0.1:0"
	}

	ln, err := net.Listen("tcp", bindAddr)
	if err != nil {
		return fmt.Errorf("failed to bind stream server on %s: %w", bindAddr, err)
	}

	s.mu.Lock()
	s.listener = ln
	s.port = ln.Addr().(*net.TCPAddr).Port
	s.mu.Unlock()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/stream/events", s.handleEventsStream)
	mux.HandleFunc("/api/stream/logs", s.handleLogsStream)
	mux.HandleFunc("/api/stream/exec", s.handleExecWS)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	s.server = &http.Server{
		Handler:      mux,
		ReadTimeout:  0, // Infinite for persistent SSE and WebSocket streams
		WriteTimeout: 0,
	}

	s.logger.Printf("Local streaming server active on http://127.0.0.1:%d", s.port)

	go func() {
		if err := s.server.Serve(ln); err != nil && err != http.ErrServerClosed {
			s.logger.Printf("Stream server exited with error: %v", err)
		}
	}()

	return nil
}

func (s *StreamServer) GetPort() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.port
}

func (s *StreamServer) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = s.server.Shutdown(ctx)
		s.server = nil
	}
}

// BroadcastNotification delivers an event to all connected /api/stream/events clients
func (s *StreamServer) BroadcastNotification(event string, payload interface{}) {
	s.subMu.RLock()
	defer s.subMu.RUnlock()

	if len(s.subscribers) == 0 {
		return
	}

	dataBytes, err := json.Marshal(payload)
	if err != nil {
		dataBytes = []byte("{}")
	}

	safeEvent := strings.ReplaceAll(event, ".", ":")
	msg := fmt.Sprintf("event: %s\ndata: %s\n\n", safeEvent, string(dataBytes))

	for ch := range s.subscribers {
		select {
		case ch <- msg:
		default:
			// Non-blocking drop if client buffer is full
		}
	}
}

// handleEventsStream provides a real-time SSE stream for push notifications
func (s *StreamServer) handleEventsStream(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported by response writer", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ch := make(chan string, 256)
	s.subMu.Lock()
	s.subscribers[ch] = struct{}{}
	s.subMu.Unlock()

	defer func() {
		s.subMu.Lock()
		delete(s.subscribers, ch)
		s.subMu.Unlock()
	}()

	// Send initial connected confirmation
	_, _ = fmt.Fprint(w, "event: connected\ndata: {\"status\":\"streaming\"}\n\n")
	flusher.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			_, _ = fmt.Fprint(w, ": heartbeat\n\n")
			flusher.Flush()
		case msg, ok := <-ch:
			if !ok {
				return
			}
			_, _ = fmt.Fprint(w, msg)
			flusher.Flush()
		}
	}
}

// handleLogsStream provides an ultra-fast Server-Sent Events (SSE) stream directly from K8s
func (s *StreamServer) handleLogsStream(w http.ResponseWriter, r *http.Request) {
	// Enable CORS for localhost
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported by response writer", http.StatusInternalServerError)
		return
	}

	q := r.URL.Query()
	contextName := q.Get("context")
	namespace := q.Get("namespace")
	podName := q.Get("pod")
	containerName := q.Get("container")
	tailLinesStr := q.Get("tailLines")
	timestamps := q.Get("timestamps") == "true"
	follow := q.Get("follow") == "true"
	previous := q.Get("previous") == "true"

	if namespace == "" || podName == "" {
		http.Error(w, "namespace and pod query parameters are required", http.StatusBadRequest)
		return
	}

	tailLines := int64(500)
	if n, err := strconv.ParseInt(tailLinesStr, 10, 64); err == nil && n > 0 {
		tailLines = n
	}

	client, _, err := s.mgr.GetClientForContext(contextName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Cluster connection failed: %v", err), http.StatusBadGateway)
		return
	}

	logOpts := &corev1.PodLogOptions{
		Container:  containerName,
		Follow:     follow,
		Previous:   previous,
		Timestamps: timestamps,
		TailLines:  &tailLines,
	}

	req := client.CoreV1().Pods(namespace).GetLogs(podName, logOpts)
	stream, err := req.Stream(r.Context())
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to open K8s log stream: %v", err), http.StatusBadGateway)
		return
	}
	defer stream.Close()

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Initial event
	fmt.Fprintf(w, "event: init\ndata: {\"pod\":\"%s\",\"container\":\"%s\"}\n\n", podName, containerName)
	flusher.Flush()

	scanner := bufio.NewScanner(stream)
	const maxLineSize = 1024 * 1024 // 1MB per log line
	scanner.Buffer(make([]byte, 64*1024), maxLineSize)

	for scanner.Scan() {
		line := scanner.Text()
		lineJson, _ := json.Marshal(line)
		fmt.Fprintf(w, "data: %s\n\n", string(lineJson))
		flusher.Flush()
	}

	if err := scanner.Err(); err != nil && err != io.EOF {
		s.logger.Printf("Log stream ended with error: %v", err)
	}

	fmt.Fprintf(w, "event: end\ndata: {}\n\n")
	flusher.Flush()
}

// Terminal resize message payload from xterm.js
type terminalResizeMsg struct {
	Type string `json:"type"` // "resize"
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

type terminalSizeQueue struct {
	sizeChan chan remotecommand.TerminalSize
}

func (q *terminalSizeQueue) Next() *remotecommand.TerminalSize {
	size, ok := <-q.sizeChan
	if !ok {
		return nil
	}
	return &size
}

// handleExecWS provides a full-duplex interactive WebSocket terminal bridge to K8s SPDY PTY
func (s *StreamServer) handleExecWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	q := r.URL.Query()
	contextName := q.Get("context")
	namespace := q.Get("namespace")
	podName := q.Get("pod")
	containerName := q.Get("container")
	shell := q.Get("shell")
	if shell == "" {
		shell = "/bin/sh"
	}

	client, restConfig, err := s.mgr.GetClientForContext(contextName)
	if err != nil {
		_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[KubeView] Failed to connect to cluster: %v\x1b[0m\r\n", err)))
		return
	}

	execConfig := rest.CopyConfig(restConfig)
	execConfig.Timeout = 0 // Required for persistent streaming!

	cmd := []string{shell}

	req := client.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		VersionedParams(&corev1.PodExecOptions{
			Container: containerName,
			Command:   cmd,
			Stdin:     true,
			Stdout:    true,
			Stderr:    true,
			TTY:       true,
		}, scheme.ParameterCodec)

	executor, err := remotecommand.NewSPDYExecutor(execConfig, "POST", req.URL())
	if err != nil {
		_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[KubeView] SPDY Executor creation failed: %v\x1b[0m\r\n", err)))
		return
	}

	stdinReader, stdinWriter := io.Pipe()
	sizeQueue := &terminalSizeQueue{
		sizeChan: make(chan remotecommand.TerminalSize, 10),
	}

	// Writer bridge: K8s stdout/stderr -> WebSocket
	wsWriter := &wsTextWriter{conn: conn}

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Task: WebSocket messages -> SPDY stdin & resize queue
	go func() {
		defer stdinWriter.Close()
		defer close(sizeQueue.sizeChan)

		for {
			msgType, data, err := conn.ReadMessage()
			if err != nil {
				cancel()
				return
			}

			if msgType == websocket.TextMessage || msgType == websocket.BinaryMessage {
				// Check if it's a resize control JSON
				if len(data) > 0 && data[0] == '{' {
					var resizeMsg terminalResizeMsg
					if err := json.Unmarshal(data, &resizeMsg); err == nil && resizeMsg.Type == "resize" {
						sizeQueue.sizeChan <- remotecommand.TerminalSize{
							Width:  resizeMsg.Cols,
							Height: resizeMsg.Rows,
						}
						continue
					}
				}

				// Otherwise it's raw user input (keystrokes)
				if _, err := stdinWriter.Write(data); err != nil {
					return
				}
			}
		}
	}()

	// Execute interactive session
	err = executor.StreamWithContext(ctx, remotecommand.StreamOptions{
		Stdin:             stdinReader,
		Stdout:            wsWriter,
		Stderr:            wsWriter,
		Tty:               true,
		TerminalSizeQueue: sizeQueue,
	})

	if err != nil {
		_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[33mSession terminated: %v\x1b[0m\r\n", err)))
	} else {
		_ = conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[32mSession closed.\x1b[0m\r\n"))
	}
}

type wsTextWriter struct {
	mu   sync.Mutex
	conn *websocket.Conn
}

func (w *wsTextWriter) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	err = w.conn.WriteMessage(websocket.BinaryMessage, p)
	if err != nil {
		return 0, err
	}
	return len(p), nil
}
