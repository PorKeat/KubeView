package stream

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/gorilla/websocket"
)

func setEnv(env []string, key, value string) []string {
	prefix := key + "="
	next := make([]string, 0, len(env)+1)
	for _, entry := range env {
		if !strings.HasPrefix(entry, prefix) {
			next = append(next, entry)
		}
	}
	return append(next, prefix+value)
}

func resolveLocalShell(requested string) (string, error) {
	if requested != "" && requested != "auto" {
		if path, err := exec.LookPath(requested); err == nil {
			return path, nil
		}
		return "", fmt.Errorf("shell %q was not found", requested)
	}

	for _, candidate := range localShellCandidates() {
		if candidate == "" {
			continue
		}
		if path, err := exec.LookPath(candidate); err == nil {
			return path, nil
		}
	}
	return "", fmt.Errorf("no local shell was found on this machine")
}

// handleLocalTerminalWS exposes a full PTY running on the user's machine.
// It is protected by the same loopback bearer token as the other stream
// endpoints; the desktop only surfaces it when the user enables local
// terminal access in Settings.
func (s *StreamServer) handleLocalTerminalWS(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	if !s.authorize(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Printf("Local terminal WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	query := r.URL.Query()
	contextName := strings.TrimSpace(query.Get("context"))
	shell, err := resolveLocalShell(strings.TrimSpace(query.Get("shell")))
	if err != nil {
		_ = conn.WriteMessage(
			websocket.TextMessage,
			[]byte(fmt.Sprintf("\r\n\x1b[31m[KubeView] %v\x1b[0m\r\n", err)),
		)
		return
	}

	cwd, err := os.UserHomeDir()
	if err != nil || cwd == "" {
		cwd = string(os.PathSeparator)
	}

	env := os.Environ()
	env = setEnv(env, "TERM", "xterm-256color")
	env = setEnv(env, "COLORTERM", "truecolor")
	if contextName != "" {
		env = setEnv(env, "KUBEVIEW_CONTEXT", contextName)
		if configPath, ok := s.mgr.ConfigFileForContext(contextName); ok {
			env = setEnv(env, "KUBECONFIG", configPath)
		}
	}

	cols, rows := uint16(80), uint16(24)
	if parsedCols, parsedRows := query.Get("cols"), query.Get("rows"); parsedCols != "" && parsedRows != "" {
		var c, rr uint16
		if _, scanErr := fmt.Sscanf(parsedCols, "%d", &c); scanErr == nil {
			cols = c
		}
		if _, scanErr := fmt.Sscanf(parsedRows, "%d", &rr); scanErr == nil {
			rows = rr
		}
	}

	process, err := startLocalShell(shell, cwd, env, cols, rows)
	if err != nil {
		_ = conn.WriteMessage(
			websocket.TextMessage,
			[]byte(fmt.Sprintf("\r\n\x1b[31m[KubeView] Failed to start %s: %v\x1b[0m\r\n", shell, err)),
		)
		return
	}
	defer process.Close()

	writer := &wsTextWriter{conn: conn}
	go func() {
		buf := make([]byte, 32*1024)
		for {
			n, readErr := process.Read(buf)
			if n > 0 {
				if _, writeErr := writer.Write(buf[:n]); writeErr != nil {
					return
				}
			}
			if readErr != nil {
				return
			}
		}
	}()

	s.logger.Printf(
		"Local terminal session started (shell=%s, context=%s, platform=%s)",
		shell, contextName, runtime.GOOS,
	)

	for {
		messageType, data, readErr := conn.ReadMessage()
		if readErr != nil {
			return
		}
		if messageType != websocket.TextMessage && messageType != websocket.BinaryMessage {
			continue
		}
		if len(data) > 0 && data[0] == '{' {
			var resizeMsg terminalResizeMsg
			if unmarshalErr := json.Unmarshal(data, &resizeMsg); unmarshalErr == nil &&
				resizeMsg.Type == "resize" &&
				resizeMsg.Cols > 0 && resizeMsg.Rows > 0 {
				_ = process.Resize(resizeMsg.Cols, resizeMsg.Rows)
				continue
			}
		}
		if len(data) == 0 {
			continue
		}
		if _, writeErr := process.Write(data); writeErr != nil {
			return
		}
	}
}
