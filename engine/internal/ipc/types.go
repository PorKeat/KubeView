package ipc

import "encoding/json"

// ProtocolVersion is the active JSON-RPC 2.0 contract version
const ProtocolVersion = "1.0.0"
const EngineVersion = "0.1.0"

// Standard JSON-RPC 2.0 error codes
const (
	ErrCodeParseError     = -32700
	ErrCodeInvalidRequest = -32600
	ErrCodeMethodNotFound = -32601
	ErrCodeInvalidParams  = -32602
	ErrCodeInternalError  = -32603
)

// KubeView specific error code strings
const (
	ErrEngineUnavailable = "ENGINE_UNAVAILABLE"
	ErrPayloadTooLarge   = "PAYLOAD_TOO_LARGE"
	ErrTimeout           = "TIMEOUT"
	ErrK8sUnauthorized   = "K8S_UNAUTHORIZED"
	ErrK8sForbidden      = "K8S_FORBIDDEN"
	ErrK8sNotFound       = "K8S_NOT_FOUND"
	ErrK8sConnFailed     = "K8S_CONNECTION_FAILED"
	ErrExecPluginFailed  = "EXEC_PLUGIN_FAILED"
)

// Request is a standard JSON-RPC 2.0 request envelope
type Request struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      interface{}     `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

// Response is a standard JSON-RPC 2.0 response envelope
type Response struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *RPCError   `json:"error,omitempty"`
}

// Notification is a server-to-client JSON-RPC 2.0 event notification (no ID)
type Notification struct {
	JSONRPC string      `json:"jsonrpc"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params"`
}

// RPCError carries detailed error context
type RPCError struct {
	Code      interface{}            `json:"code"` // int or string code
	Message   string                 `json:"message"`
	Retryable bool                   `json:"retryable,omitempty"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// HandshakeParams received from Tauri client
type HandshakeParams struct {
	ClientVersion   string   `json:"clientVersion"`
	ProtocolVersion string   `json:"protocolVersion"`
	Capabilities    []string `json:"capabilities"`
}

// HandshakeResult sent back to client
type HandshakeResult struct {
	EngineVersion        string   `json:"engineVersion"`
	ProtocolVersion      string   `json:"protocolVersion"`
	Status               string   `json:"status"` // "ready" | "degraded"
	SupportedAPIVersions []string `json:"supportedApiVersions"`
	StreamPort           int      `json:"streamPort,omitempty"`
	StreamToken          string   `json:"streamToken,omitempty"`
}
