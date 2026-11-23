import { NextRequest, NextResponse } from "next/server";
import { engineBridge } from "@/lib/server/engineBridge";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1024 * 1024;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function hostnameFromHeader(host: string | null): string {
  if (!host) return "";
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end > 0 ? host.slice(1, end) : host;
  }
  return host.split(":")[0].toLowerCase();
}

function hostnameFromOrigin(origin: string | null): string {
  if (!origin) return "";
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * The hard security boundary is the dev server binding to 127.0.0.1. This
 * check is defense-in-depth against DNS rebinding and misconfigured hosts:
 * the Host header is client-controlled, so it must never be the only guard.
 * The Origin check also rejects cross-origin browser requests.
 */
function isLoopbackRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (origin && !LOOPBACK_HOSTS.has(hostnameFromOrigin(origin))) {
    return false;
  }
  return LOOPBACK_HOSTS.has(hostnameFromHeader(req.headers.get("host")));
}

function errorCode(err: unknown): unknown {
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code?: unknown }).code;
  }
  return undefined;
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof err === "string" && err.trim()) return err;
  return "Internal error executing RPC method";
}

function statusForCode(code: unknown): number {
  switch (code) {
    case "ENGINE_UNAVAILABLE":
      return 503;
    case "K8S_UNAUTHORIZED":
    case "K8S_FORBIDDEN":
      return 403;
    case "K8S_NOT_FOUND":
    case -32601:
      return 404;
    case "K8S_CONFLICT":
      return 409;
    case "INVALID_PARAMS":
    case -32602:
      return 400;
    case "TIMEOUT":
      return 504;
    default:
      return 500;
  }
}

export async function POST(req: NextRequest) {
  if (!isLoopbackRequest(req)) {
    return NextResponse.json(
      {
        error: {
          code: -32600,
          message: "RPC is restricted to loopback requests",
        },
      },
      { status: 403 },
    );
  }

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request body is too large",
        },
      },
      { status: 413 },
    );
  }

  try {
    const text = await req.text();
    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: { code: -32600, message: "Empty request body" } },
        { status: 400 },
      );
    }
    if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Request body is too large",
          },
        },
        { status: 413 },
      );
    }

    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: {
            code: -32600,
            message: "Invalid Request: body must be a JSON object",
          },
        },
        { status: 400 },
      );
    }

    const { method, params } = body as { method?: unknown; params?: unknown };
    if (!method || typeof method !== "string") {
      return NextResponse.json(
        {
          error: {
            code: -32600,
            message: "Invalid Request: 'method' must be a string",
          },
        },
        { status: 400 },
      );
    }

    const result = await engineBridge.request(method, params);
    return NextResponse.json({ result });
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: { code: -32700, message: "Parse error: invalid JSON" } },
        { status: 400 },
      );
    }
    console.error("[/api/rpc] Handler error:", err);
    const code = errorCode(err) ?? -32603;
    return NextResponse.json(
      { error: { code, message: errorMessage(err) } },
      { status: statusForCode(code) },
    );
  }
}
