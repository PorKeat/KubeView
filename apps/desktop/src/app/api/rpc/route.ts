import { NextRequest, NextResponse } from "next/server";
import { engineBridge } from "@/lib/server/engineBridge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params } = body;

    if (!method || typeof method !== "string") {
      return NextResponse.json(
        { error: { code: -32600, message: "Invalid Request: 'method' must be a string" } },
        { status: 400 }
      );
    }

    const result = await engineBridge.request(method, params);
    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("[/api/rpc] Handler error:", err);
    return NextResponse.json(
      {
        error: {
          code: err.code || -32603,
          message: err.message || "Internal error executing RPC method",
        },
      },
      { status: 500 }
    );
  }
}
