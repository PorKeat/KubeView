package stream

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/kubeview/engine/internal/cluster"
)

type StreamServer struct {
	mu          sync.RWMutex
	mgr         *cluster.Manager
	logger      *log.Logger
	listener    net.Listener
	port        int
	token       string
	server      *http.Server
	subMu       sync.RWMutex
	subscribers map[chan string]struct{}
}

func NewStreamServer(mgr *cluster.Manager) *StreamServer {
	token, err := generateToken()
	if err != nil {
		log.Printf("[stream-server] failed to generate auth token: %v", err)
	}
	return &StreamServer{
		mgr:         mgr,
		logger:      log.New(os.Stderr, "[stream-server] ", log.LstdFlags|log.Lmicroseconds),
		token:       token,
		subscribers: make(map[chan string]struct{}),
	}
}

// Start binds an ephemeral port on 127.0.0.1 and starts the HTTP/SSE/WebSocket server
func (s *StreamServer) Start(bindAddr string) error {
	if bindAddr == "" {
		bindAddr = "127.0.0.1:0"
	}

	if s.token == "" {
		return fmt.Errorf("stream server authentication token is unavailable")
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
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       0, // Infinite for persistent SSE and WebSocket streams
		WriteTimeout:      0,
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

// Token returns the per-process bearer token required by every stream endpoint.
func (s *StreamServer) Token() string {
	return s.token
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
	setCORSHeaders(w, r)

	if r.Method == http.MethodOptions {
		if !originAllowed(r.Header.Get("Origin")) {
			http.Error(w, "forbidden origin", http.StatusForbidden)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	if !s.authorize(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
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
