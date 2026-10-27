package main

import (
	"encoding/json"

	"github.com/kubeview/engine/internal/ipc"
	"github.com/kubeview/engine/internal/stream"
)

func registerCoreHandlers(server *ipc.Server, streamSrv *stream.StreamServer) {
	// Method: handshake
	server.Register("handshake", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p ipc.HandshakeParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}

		server.Log("Handshake received from client version: %s (protocol %s)", p.ClientVersion, p.ProtocolVersion)

		return &ipc.HandshakeResult{
			EngineVersion:        ipc.EngineVersion,
			ProtocolVersion:      ipc.ProtocolVersion,
			Status:               "ready",
			SupportedAPIVersions: []string{"v1"},
			StreamPort:           streamSrv.GetPort(),
			StreamToken:          streamSrv.Token(),
		}, nil
	})
}
