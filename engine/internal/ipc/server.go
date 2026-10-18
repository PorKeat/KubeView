package ipc

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"sync"
)

// HandlerFunc is the signature of an RPC method handler
type HandlerFunc func(params json.RawMessage) (interface{}, *RPCError)

// Server handles JSON-RPC 2.0 communication over io streams (stdin/stdout)
type Server struct {
	reader   io.Reader
	writer   io.Writer
	logger   *log.Logger
	handlers map[string]HandlerFunc
	mu       sync.Mutex
	stopCh   chan struct{}
	wg       sync.WaitGroup
}

// NewServer initializes a new Server with stdin/stdout and stderr logger
func NewServer(r io.Reader, w io.Writer) *Server {
	if r == nil {
		r = os.Stdin
	}
	if w == nil {
		w = os.Stdout
	}
	return &Server{
		reader:   r,
		writer:   w,
		logger:   log.New(os.Stderr, "[kubeview-engine] ", log.LstdFlags|log.Lmicroseconds),
		handlers: make(map[string]HandlerFunc),
		stopCh:   make(chan struct{}),
	}
}

// Register registers a handler for an RPC method
func (s *Server) Register(method string, handler HandlerFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.handlers[method] = handler
}

// Log logs information to stderr safely (never corrupting stdout)
func (s *Server) Log(format string, v ...interface{}) {
	s.logger.Printf(format, v...)
}

// SendNotification sends a push notification to the client
func (s *Server) SendNotification(method string, params interface{}) error {
	notif := Notification{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
	}
	data, err := json.Marshal(notif)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	_, err = fmt.Fprintf(s.writer, "%s\n", string(data))
	return err
}

// Run begins reading JSON-RPC lines until EOF or Stop is called
func (s *Server) Run() error {
	scanner := bufio.NewScanner(s.reader)
	// Allow up to 16MB lines for large kubeconfig or cluster specs
	const maxCapacity = 16 * 1024 * 1024
	buf := make([]byte, 1024*1024)
	scanner.Buffer(buf, maxCapacity)

	s.Log("JSON-RPC 2.0 engine server listening on stdio (protocol %s)", ProtocolVersion)

	for {
		select {
		case <-s.stopCh:
			s.Log("Server stop signal received")
			return nil
		default:
		}

		if !scanner.Scan() {
			if err := scanner.Err(); err != nil {
				s.Log("Scanner read error: %v", err)
				return err
			}
			s.Log("Scanner reached EOF; closing engine")
			return nil
		}

		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		// Handle request in a goroutine so slow RPCs don't block subsequent reads
		lineCopy := make([]byte, len(line))
		copy(lineCopy, line)
		s.wg.Add(1)
		go func(l []byte) {
			defer s.wg.Done()
			s.handleLine(l)
		}(lineCopy)
	}
}

// Wait blocks until all in-flight requests complete
func (s *Server) Wait() {
	s.wg.Wait()
}

// Stop terminates the server read loop
func (s *Server) Stop() {
	close(s.stopCh)
}

func (s *Server) handleLine(line []byte) {
	var req Request
	if err := json.Unmarshal(line, &req); err != nil {
		s.sendError(nil, &RPCError{
			Code:    ErrCodeParseError,
			Message: fmt.Sprintf("Invalid JSON: %v", err),
		})
		return
	}

	if req.JSONRPC != "2.0" || req.Method == "" {
		s.sendError(req.ID, &RPCError{
			Code:    ErrCodeInvalidRequest,
			Message: "Invalid Request: 'jsonrpc' must be '2.0' and 'method' is required",
		})
		return
	}

	s.mu.Lock()
	handler, exists := s.handlers[req.Method]
	s.mu.Unlock()

	if !exists {
		s.sendError(req.ID, &RPCError{
			Code:    ErrCodeMethodNotFound,
			Message: fmt.Sprintf("Method '%s' not found", req.Method),
		})
		return
	}

	res, rpcErr := handler(req.Params)
	if rpcErr != nil {
		s.sendError(req.ID, rpcErr)
		return
	}

	s.sendResult(req.ID, res)
}

func (s *Server) sendResult(id interface{}, result interface{}) {
	if id == nil {
		return // Notification, no reply needed
	}

	resp := Response{
		JSONRPC: "2.0",
		ID:      id,
		Result:  result,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		s.Log("Failed to serialize response: %v", err)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	_, _ = fmt.Fprintf(s.writer, "%s\n", string(data))
}

func (s *Server) sendError(id interface{}, rpcErr *RPCError) {
	resp := Response{
		JSONRPC: "2.0",
		ID:      id,
		Error:   rpcErr,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		s.Log("Failed to serialize error response: %v", err)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	_, _ = fmt.Fprintf(s.writer, "%s\n", string(data))
}
