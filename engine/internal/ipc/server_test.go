package ipc

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestIPCServer(t *testing.T) {
	in := bytes.NewBufferString(`{"jsonrpc":"2.0","id":1,"method":"handshake","params":{"clientVersion":"0.1.0","protocolVersion":"1.0.0"}}` + "\n")
	var out bytes.Buffer

	server := NewServer(in, &out)
	server.Register("handshake", func(params json.RawMessage) (interface{}, *RPCError) {
		return &HandshakeResult{
			EngineVersion:   EngineVersion,
			ProtocolVersion: ProtocolVersion,
			Status:          "ready",
		}, nil
	})

	// Run to EOF of the buffer
	err := server.Run()
	if err != nil {
		t.Fatalf("Server run error: %v", err)
	}
	server.Wait()

	outputStr := out.String()
	if !strings.Contains(outputStr, `"jsonrpc":"2.0"`) {
		t.Fatalf("Expected valid JSON-RPC 2.0 response, got: %s", outputStr)
	}
	if !strings.Contains(outputStr, `"protocolVersion":"1.0.0"`) {
		t.Fatalf("Expected protocolVersion 1.0.0 in result, got: %s", outputStr)
	}
	if !strings.Contains(outputStr, `"status":"ready"`) {
		t.Fatalf("Expected status ready in result, got: %s", outputStr)
	}
}

func TestIPCMethodNotFound(t *testing.T) {
	in := bytes.NewBufferString(`{"jsonrpc":"2.0","id":"req-404","method":"unknown.method"}` + "\n")
	var out bytes.Buffer

	server := NewServer(in, &out)
	_ = server.Run()
	server.Wait()

	outputStr := out.String()
	if !strings.Contains(outputStr, `Method 'unknown.method' not found`) {
		t.Fatalf("Expected method not found error, got: %s", outputStr)
	}
}

func TestIPCPanicRecovery(t *testing.T) {
	in := bytes.NewBufferString(`{"jsonrpc":"2.0","id":7,"method":"panic.method"}` + "\n")
	var out bytes.Buffer

	server := NewServer(in, &out)
	server.Register("panic.method", func(json.RawMessage) (interface{}, *RPCError) {
		panic("boom")
	})
	_ = server.Run()
	server.Wait()

	outputStr := out.String()
	if !strings.Contains(outputStr, `"code":-32603`) {
		t.Fatalf("Expected internal error code after panic, got: %s", outputStr)
	}
	if !strings.Contains(outputStr, `"id":7`) {
		t.Fatalf("Expected request id 7 in panic response, got: %s", outputStr)
	}
}
