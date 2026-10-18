/**
 * JSON-RPC 2.0 Protocol Envelope and Error Definitions for KubeView
 * Protocol Version: 1.0.0
 */

export const PROTOCOL_VERSION = "1.0.0";

export type RequestId = string | number;

export interface JsonRpcRequest<TParams = unknown> {
  jsonrpc: "2.0";
  id: RequestId;
  method: string;
  params?: TParams;
}

export interface JsonRpcResponse<TResult = unknown> {
  jsonrpc: "2.0";
  id: RequestId;
  result?: TResult;
  error?: JsonRpcError;
}

export interface JsonRpcNotification<TParams = unknown> {
  jsonrpc: "2.0";
  method: string;
  params: TParams;
}

export interface JsonRpcError {
  code: ErrorCode | number;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export enum ErrorCode {
  // Standard JSON-RPC 2.0 Error Codes
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // KubeView Engine Lifecycle & Process Errors
  ENGINE_UNAVAILABLE = -32000,
  PAYLOAD_TOO_LARGE = -32001,
  TIMEOUT = -32002,
  STREAM_TERMINATED = -32003,

  // Kubernetes API & Authentication Errors
  K8S_UNAUTHORIZED = "K8S_UNAUTHORIZED",
  K8S_FORBIDDEN = "K8S_FORBIDDEN",
  K8S_NOT_FOUND = "K8S_NOT_FOUND",
  K8S_CONFLICT = "K8S_CONFLICT",
  K8S_UNPROCESSABLE = "K8S_UNPROCESSABLE",
  K8S_TIMEOUT = "K8S_TIMEOUT",
  K8S_CONNECTION_FAILED = "K8S_CONNECTION_FAILED",

  // Credential Plugin Errors
  EXEC_PLUGIN_FAILED = "EXEC_PLUGIN_FAILED",
  EXEC_PLUGIN_UNAPPROVED = "EXEC_PLUGIN_UNAPPROVED",
  EXEC_PLUGIN_TIMEOUT = "EXEC_PLUGIN_TIMEOUT",
}

export interface HandshakeParams {
  clientVersion: string;
  protocolVersion: string;
  capabilities: string[];
}

export interface HandshakeResult {
  engineVersion: string;
  protocolVersion: string;
  status: "ready" | "degraded";
  supportedApiVersions: string[];
}
