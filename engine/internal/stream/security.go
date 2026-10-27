package stream

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return originAllowed(r.Header.Get("Origin"))
	},
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
}

var allowedStreamOrigins = map[string]struct{}{
	"":                        {},
	"tauri://localhost":       {},
	"http://tauri.localhost":  {},
	"https://tauri.localhost": {},
	"http://localhost:3005":   {},
	"http://127.0.0.1:3005":   {},
}

func originAllowed(origin string) bool {
	_, ok := allowedStreamOrigins[strings.TrimSpace(origin)]
	return ok
}

func generateToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func (s *StreamServer) authorize(r *http.Request) bool {
	if s.token == "" {
		return false
	}
	provided := r.URL.Query().Get("token")
	if provided == "" {
		auth := r.Header.Get("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			provided = strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
		}
	}
	if provided == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(provided), []byte(s.token)) == 1
}

func setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" || !originAllowed(origin) {
		return
	}
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Add("Vary", "Origin")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}
