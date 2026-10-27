package stream

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
)

func writeSSEJSON(w io.Writer, event string, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		data = []byte("{}")
	}
	_, _ = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, data)
}

// handleLogsStream provides an ultra-fast Server-Sent Events (SSE) stream directly from K8s
func (s *StreamServer) handleLogsStream(w http.ResponseWriter, r *http.Request) {
	// Enable CORS for localhost
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
		if previous && (strings.Contains(strings.ToLower(err.Error()), "previous terminated container") || strings.Contains(strings.ToLower(err.Error()), "not found")) {
			w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
			w.Header().Set("Cache-Control", "no-cache, no-transform")
			w.Header().Set("Connection", "keep-alive")
			writeSSEJSON(w, "init", map[string]string{"pod": podName, "container": containerName})
			writeSSEJSON(w, "end", map[string]string{})
			flusher.Flush()
			return
		}
		http.Error(w, fmt.Sprintf("Failed to open K8s log stream: %v", err), http.StatusBadGateway)
		return
	}
	defer stream.Close()

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Initial event
	writeSSEJSON(w, "init", map[string]string{"pod": podName, "container": containerName})
	flusher.Flush()

	scanner := bufio.NewScanner(stream)
	const maxLineSize = 1024 * 1024 // 1MB per log line
	scanner.Buffer(make([]byte, 64*1024), maxLineSize)

	// Micro-batch flush for maximum throughput and minimal client thread thrashing
	batch := make([]string, 0, 32)
	lastFlush := time.Now()

	for scanner.Scan() {
		batch = append(batch, scanner.Text())
		if len(batch) >= 32 || time.Since(lastFlush) > 25*time.Millisecond {
			for _, line := range batch {
				lineJson, _ := json.Marshal(line)
				fmt.Fprintf(w, "data: %s\n\n", string(lineJson))
			}
			flusher.Flush()
			batch = batch[:0]
			lastFlush = time.Now()
		}
	}
	if len(batch) > 0 {
		for _, line := range batch {
			lineJson, _ := json.Marshal(line)
			fmt.Fprintf(w, "data: %s\n\n", string(lineJson))
		}
		flusher.Flush()
	}

	if err := scanner.Err(); err != nil && err != io.EOF {
		s.logger.Printf("Log stream ended with error: %v", err)
	}

	writeSSEJSON(w, "end", map[string]string{})
	flusher.Flush()
}
