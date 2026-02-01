import { NextResponse } from "next/server";

const RPC_URL = "http://127.0.0.1:8545";
const ALLOWED_METHODS = new Set(["evm_increaseTime", "evm_mine"]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const method = body?.method;
  const params = body?.params ?? [];

  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 400 });
  }

  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  };

  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Local RPC not reachable" },
      { status: 500 }
    );
  }
}
