package stream

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/remotecommand"
)

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

func isNoSuchFileError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "no such file or directory") ||
		strings.Contains(msg, "executable file not found") ||
		(strings.Contains(msg, "exec failed") && strings.Contains(msg, "stat "))
}

// handleExecWS provides a full-duplex interactive WebSocket terminal bridge to K8s SPDY PTY
func (s *StreamServer) handleExecWS(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	if !s.authorize(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
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
		shell = "auto"
	}

	client, restConfig, err := s.mgr.GetClientForContext(contextName)
	if err != nil {
		_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[KubeView] Failed to connect to cluster: %v\x1b[0m\r\n", err)))
		return
	}

	execConfig := rest.CopyConfig(restConfig)
	execConfig.Timeout = 0 // Required for persistent streaming!

	candidates := []string{shell}
	if shell == "auto" {
		candidates = []string{"/bin/sh", "/bin/bash", "/bin/ash", "sh", "bash"}
	} else {
		seen := map[string]bool{shell: true}
		for _, s := range []string{"/bin/sh", "/bin/bash", "/bin/ash", "sh", "bash"} {
			if !seen[s] {
				candidates = append(candidates, s)
				seen[s] = true
			}
		}
	}

	inputChan := make(chan []byte, 64)
	sizeQueue := &terminalSizeQueue{
		sizeChan: make(chan remotecommand.TerminalSize, 10),
	}

	readCtx, readCancel := context.WithCancel(r.Context())
	defer readCancel()

	// WebSocket receiver goroutine
	go func() {
		defer close(inputChan)
		defer close(sizeQueue.sizeChan)

		for {
			msgType, data, err := conn.ReadMessage()
			if err != nil {
				readCancel()
				return
			}

			if msgType == websocket.TextMessage || msgType == websocket.BinaryMessage {
				if len(data) > 0 && data[0] == '{' {
					var resizeMsg terminalResizeMsg
					if err := json.Unmarshal(data, &resizeMsg); err == nil && resizeMsg.Type == "resize" {
						select {
						case sizeQueue.sizeChan <- remotecommand.TerminalSize{
							Width:  resizeMsg.Cols,
							Height: resizeMsg.Rows,
						}:
						default:
						}
						continue
					}
				}

				buf := make([]byte, len(data))
				copy(buf, data)
				select {
				case inputChan <- buf:
				case <-readCtx.Done():
					return
				}
			}
		}
	}()

	wsWriter := &wsTextWriter{conn: conn}
	var lastErr error

	for idx, cand := range candidates {
		req := client.CoreV1().RESTClient().Post().
			Resource("pods").
			Name(podName).
			Namespace(namespace).
			SubResource("exec").
			VersionedParams(&corev1.PodExecOptions{
				Container: containerName,
				Command:   []string{cand},
				Stdin:     true,
				Stdout:    true,
				Stderr:    true,
				TTY:       true,
			}, scheme.ParameterCodec)

		executor, err := remotecommand.NewSPDYExecutor(execConfig, "POST", req.URL())
		if err != nil {
			lastErr = err
			continue
		}

		stdinReader, stdinWriter := io.Pipe()
		candCtx, candCancel := context.WithCancel(readCtx)

		// Forward WebSocket input to stdin pipe
		go func(w *io.PipeWriter, ctx context.Context) {
			defer w.Close()
			for {
				select {
				case <-ctx.Done():
					return
				case data, ok := <-inputChan:
					if !ok {
						return
					}
					if _, err := w.Write(data); err != nil {
						return
					}
				}
			}
		}(stdinWriter, candCtx)

		if idx > 0 {
			_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[36m[KubeView] Trying alternative shell: %s...\x1b[0m\r\n", cand)))
		}

		err = executor.StreamWithContext(candCtx, remotecommand.StreamOptions{
			Stdin:             stdinReader,
			Stdout:            wsWriter,
			Stderr:            wsWriter,
			Tty:               true,
			TerminalSizeQueue: sizeQueue,
		})

		candCancel()

		if err == nil {
			_ = conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[32mSession closed.\x1b[0m\r\n"))
			return
		}

		lastErr = err

		// If shell executable was not found, test next candidate
		if isNoSuchFileError(err) {
			continue
		}

		// Other error (e.g. context cancelled, pod terminated), break out
		_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[33mSession terminated: %v\x1b[0m\r\n", err)))
		return
	}

	// If all candidates failed with no such file error, this is a distroless / scratch container!
	if isNoSuchFileError(lastErr) {

		distrolessNotice := fmt.Sprintf(
			"\r\n\x1b[1;31m[KubeView] No interactive shell found in container (%s).\x1b[0m\r\n"+
				"\x1b[33mℹ Distroless or Minimal Container Image Detected:\x1b[0m\r\n"+
				"  Container '%s' has no /bin/sh, /bin/bash, or /bin/ash installed.\r\n"+
				"  Distroless, scratch, and minimal Go/Rust images intentionally omit shells for security.\r\n\r\n"+
				"\x1b[36mRecommended Actions:\x1b[0m\r\n"+
				"  • Switch to the \x1b[1mCommand Runner\x1b[0m tab above to execute binaries directly\r\n"+
				"  • Launch an ephemeral debug container:\r\n"+
				"      \x1b[32mkubectl debug -it -n %s %s --image=busybox --target=%s\x1b[0m\r\n"+
				"  • View runtime stdout/stderr logs in the \x1b[1mPod Logs\x1b[0m modal\r\n\r\n",
			containerName, containerName, namespace, podName, containerName,
		)
		_ = conn.WriteMessage(websocket.TextMessage, []byte(distrolessNotice))
		_ = conn.WriteMessage(websocket.TextMessage, []byte("{\"__kubeview_event\":\"distroless_detected\"}"))
	} else if lastErr != nil {
		_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[33mSession terminated: %v\x1b[0m\r\n", lastErr)))
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
