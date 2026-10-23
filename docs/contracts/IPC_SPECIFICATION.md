# KubeView — Versioned IPC Specification (`rpc/v1`)

> **Protocol Version:** `1.0.0`  
> **Guiding Principle:** IPC must never be an ad-hoc, undocumented channel. It is the single typed contract connecting the **Next.js UI**, the **Tauri Rust host**, and the **Go Kubernetes engine**.

---

## 1. Transport & Wire Framing

1. **Transport Mechanism:** Standard I/O pipes (`stdin` and `stdout` of the Go engine subprocess).
2. **Framing:** Strict **newline-delimited JSON (`\n`)**. Every message must be a single contiguous line of UTF-8 text ending with `\n`.
3. **Payload Size Limit:** Maximum message size is **16 MB**. Messages exceeding this limit are discarded with error `PAYLOAD_TOO_LARGE`.
4. **Logging Isolation:** Go diagnostic logs MUST be written to `stderr` using `log/slog`. Writing logs or non-JSON text to `stdout` is a fatal protocol violation.
5. **No Network Sockets:** No local TCP or HTTP ports are opened for core communication.

---

## 2. Handshake & Version Negotiation

Upon sidecar launch, the Rust host immediately initiates a handshake before any other RPC calls are permitted.

### Request: `engine.handshake`

```json
{
  "jsonrpc": "2.0",
  "id": "init-01",
  "method": "engine.handshake",
  "params": {
    "clientVersion": "0.1.0",
    "protocolVersion": "1.0.0",
    "capabilities": ["streaming", "diff", "metrics", "exec"]
  }
}
```

### Response: `engine.handshake`

```json
{
  "jsonrpc": "2.0",
  "id": "init-01",
  "result": {
    "engineVersion": "0.1.0",
    "protocolVersion": "1.0.0",
    "status": "ready",
    "supportedApiVersions": ["1.0.0"]
  }
}
```

If `protocolVersion` does not match major version `1.x`, Rust terminates the sidecar with a fatal incompatibility alert.

---

## 3. Standard Message Envelopes

### 3.1 Common Resource Identifiers & Envelopes

```typescript
export interface ResourceRef {
  clusterId: string;
  apiVersion: string;
  resource: string;
  namespace?: string;
  name: string;
}

export interface ListResourcesRequest {
  clusterId: string;
  apiVersion: string;
  resource: string;
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
  limit?: number;
  continueToken?: string;
}

export interface ResourceList<T = Record<string, unknown>> {
  items: T[];
  continueToken?: string | null;
  resourceVersion?: string;
  totalCount?: number;
}
```

### 3.2 Streaming Subscription Envelopes

```typescript
export interface StreamStartResult {
  streamId: string;
}

export interface StreamEvent<T = unknown> {
  streamId: string;
  sequence: number;
  type: "data" | "error" | "closed";
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

---

## 4. API Domains & Method Signatures

### 4.1 Domain: `engine`

| Method             | Params                               | Result                                           | Description                          |
| :----------------- | :----------------------------------- | :----------------------------------------------- | :----------------------------------- |
| `engine.status`    | `{}`                                 | `{ status, uptime, memoryBytes, activeStreams }` | Health and diagnostic status.        |
| `engine.handshake` | `{ clientVersion, protocolVersion }` | `{ engineVersion, protocolVersion, status }`     | Version negotiation.                 |
| `engine.shutdown`  | `{ timeoutMs?: number }`             | `{ acknowledged: boolean }`                      | Initiates graceful sidecar shutdown. |

### 4.2 Domain: `clusters` & `contexts`

| Method             | Params                  | Result                                                | Description                           |
| :----------------- | :---------------------- | :---------------------------------------------------- | :------------------------------------ |
| `contexts.list`    | `{}`                    | `{ contexts: KubeContext[], currentContext: string }` | Discovered kubeconfig contexts.       |
| `clusters.get`     | `{ clusterId: string }` | `{ clusterInfo: ClusterSummary }`                     | Endpoint, latency, and K8s version.   |
| `clusters.refresh` | `{}`                    | `{ updatedContexts: number }`                         | Triggers immediate kubeconfig reload. |

### 4.3 Domain: `resources`

| Method             | Params                                                   | Result                                                                    | Description                        |
| :----------------- | :------------------------------------------------------- | :------------------------------------------------------------------------ | :--------------------------------- |
| `resources.list`   | `ListResourcesRequest`                                   | `ResourceList<T>`                                                         | Paginated, filtered resource list. |
| `resources.get`    | `ResourceRef`                                            | `{ item: T }`                                                             | Fetch live resource manifest.      |
| `resources.create` | `{ clusterId, manifestYaml: string }`                    | `{ item: T }`                                                             | Create resource from manifest.     |
| `resources.patch`  | `{ ref: ResourceRef, patch: object, patchType: string }` | `{ item: T }`                                                             | Strategic merge or JSON patch.     |
| `resources.delete` | `{ ref: ResourceRef, gracePeriodSeconds?: number }`      | `{ deleted: boolean }`                                                    | Safe deletion with confirmation.   |
| `resources.diff`   | `{ clusterId, manifestYaml: string }`                    | `{ diff: string, live: object, proposed: object, changes: DiffChange[] }` | Server-side dry-run semantic diff. |

### 4.4 Domain: `discovery`

| Method                | Params                                                    | Result                             | Description                         |
| :-------------------- | :-------------------------------------------------------- | :--------------------------------- | :---------------------------------- |
| `discovery.apiGroups` | `{ clusterId: string }`                                   | `{ groups: APIGroupInfo[] }`       | Discovered API groups.              |
| `discovery.resources` | `{ clusterId: string }`                                   | `{ resources: APIResourceInfo[] }` | Available resource kinds and verbs. |
| `discovery.schema`    | `{ clusterId: string, apiVersion: string, kind: string }` | `{ jsonSchema: object }`           | OpenAPI v3 validation schema.       |

### 4.5 Domain: `watch` (Informers)

| Method                       | Params                                                            | Result / Events                                                        | Description                          |
| :--------------------------- | :---------------------------------------------------------------- | :--------------------------------------------------------------------- | :----------------------------------- |
| `watch.start`                | `{ clusterId, apiVersion, resource, namespace?, labelSelector? }` | `{ streamId: string }`                                                 | Starts resource change subscription. |
| `watch.event` (Notification) | N/A (Server Push)                                                 | `StreamEvent<{ type: "ADDED" \| "MODIFIED" \| "DELETED", object: T }>` | Informer Delta event.                |
| `watch.stop`                 | `{ streamId: string }`                                            | `{ stopped: boolean }`                                                 | Cancels active watch subscription.   |

### 4.6 Domain: `logs`

| Method                      | Params                                                                        | Result / Events                    | Description                   |
| :-------------------------- | :---------------------------------------------------------------------------- | :--------------------------------- | :---------------------------- |
| `logs.start`                | `{ clusterId, namespace, podName, container, tailLines?, since?, previous? }` | `{ streamId: string }`             | Initiates chunked log stream. |
| `logs.chunk` (Notification) | N/A (Server Push)                                                             | `StreamEvent<{ lines: string[] }>` | Bounded log lines chunk.      |
| `logs.stop`                 | `{ streamId: string }`                                                        | `{ stopped: boolean }`             | Terminates active log stream. |

### 4.7 Domain: `exec` (PTY Terminal)

| Method                       | Params                                                                          | Result / Events                 | Description                     |
| :--------------------------- | :------------------------------------------------------------------------------ | :------------------------------ | :------------------------------ |
| `exec.start`                 | `{ clusterId, namespace, podName, container, command: string[], tty: boolean }` | `{ streamId: string }`          | Starts interactive PTY session. |
| `exec.input`                 | `{ streamId: string, data: string }`                                            | `{ acknowledged: boolean }`     | Sends stdin bytes to container. |
| `exec.resize`                | `{ streamId: string, cols: number, rows: number }`                              | `{ acknowledged: boolean }`     | Sends SIGWINCH terminal resize. |
| `exec.output` (Notification) | N/A (Server Push)                                                               | `StreamEvent<{ data: string }>` | stdout/stderr ANSI stream.      |
| `exec.stop`                  | `{ streamId: string }`                                                          | `{ exitCode: number }`          | Terminates terminal session.    |

### 4.8 Domain: `network` (Port-Forwarding)

| Method              | Params                                                                      | Result                                    | Description                            |
| :------------------ | :-------------------------------------------------------------------------- | :---------------------------------------- | :------------------------------------- |
| `portForward.start` | `{ clusterId, namespace, podName, targetPort: number, localPort?: number }` | `{ streamId: string, localPort: number }` | Establishes local port-forward tunnel. |
| `portForward.stop`  | `{ streamId: string }`                                                      | `{ stopped: boolean }`                    | Tears down active port-forward tunnel. |

### 4.9 Domain: `metrics`

| Method            | Params                                                                           | Result                              | Description                          |
| :---------------- | :------------------------------------------------------------------------------- | :---------------------------------- | :----------------------------------- |
| `metrics.current` | `{ clusterId: string, resourceType: "nodes" \| "pods", namespace?: string }`     | `{ metrics: ResourceMetricItem[] }` | Metrics Server CPU/Memory telemetry. |
| `metrics.query`   | `{ clusterId: string, query: string, start: number, end: number, step: number }` | `{ series: MetricSeries[] }`        | Prometheus PromQL evaluation.        |

---

## 5. Standardized Error Codes & Redaction Guarantees

Every error response strictly conforms to the JSON-RPC 2.0 error specification with structured, redacted details:

```json
{
  "jsonrpc": "2.0",
  "id": "req-1042",
  "error": {
    "code": "K8S_FORBIDDEN",
    "message": "User 'developer' cannot list resource 'pods' in API group '' at cluster scope.",
    "retryable": false,
    "details": {
      "resource": "pods",
      "namespace": "production",
      "verb": "list"
    }
  }
}
```

### Standard Error Catalog

| Error Code           |  HTTP / K8s Mapping   | Retryable? | Description                                                 |
| :------------------- | :-------------------: | :--------: | :---------------------------------------------------------- |
| `INVALID_REQUEST`    |       `-32600`        |     No     | Malformed JSON or invalid envelope.                         |
| `METHOD_NOT_FOUND`   |       `-32601`        |     No     | Unrecognized RPC method.                                    |
| `INVALID_PARAMS`     |       `-32602`        |     No     | Request parameters failed Zod/Go schema validation.         |
| `ENGINE_UNAVAILABLE` |       `-32000`        |    Yes     | Engine is starting or recovering from a crash.              |
| `K8S_UNAUTHORIZED`   |  `401 Unauthorized`   |     No     | Credentials expired or missing; re-authentication required. |
| `K8S_FORBIDDEN`      |    `403 Forbidden`    |     No     | RBAC permission denied for requested verb and resource.     |
| `K8S_NOT_FOUND`      |    `404 Not Found`    |     No     | Target cluster, namespace, or resource does not exist.      |
| `K8S_CONFLICT`       |    `409 Conflict`     |    Yes     | Resource version mismatch; requires re-fetch before patch.  |
| `K8S_UNPROCESSABLE`  |  `422 Unprocessable`  |     No     | Schema validation failure or admission webhook rejection.   |
| `K8S_TIMEOUT`        | `504 Gateway Timeout` |    Yes     | Kube-APIServer unreachable or request exceeded timeout.     |
| `STREAM_TERMINATED`  |          N/A          |     No     | Stream closed by remote end or subscription canceled.       |

### Redaction Rules

- Raw bearer tokens, client certificates, private keys, authorization headers, and complete `v1/Secret` data must **NEVER** appear in `error.message` or `error.details`.
- Before emitting an error, the Go engine sanitizes error messages using a regex redactor.
