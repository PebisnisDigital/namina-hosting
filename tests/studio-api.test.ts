import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import handler from "../api/studio.ts";

async function invoke(method: string, action: string, headers: Record<string, string> = {}) {
  const state = { statusCode: 200, body: "", headers: {} as Record<string, string> };
  const response = {
    setHeader(name: string, value: string) { state.headers[name] = value; return response; },
    end(body: string) { state.body = body; return response; },
    get statusCode() { return state.statusCode; },
    set statusCode(value: number) { state.statusCode = value; },
  } as unknown as ServerResponse;
  const request = { method, url: `/api/studio?action=${action}`, headers, body: {} } as IncomingMessage;
  await handler(request, response);
  return { status: state.statusCode, body: JSON.parse(state.body) as { authenticated?: boolean; error?: string; configured?: boolean } };
}

test("Studio reports that credentials are missing, without exposing values", async () => {
  const old = process.env.NAMANA_GITHUB_TOKEN;
  delete process.env.NAMANA_GITHUB_TOKEN;
  try {
    const result = await invoke("GET", "session");
    assert.equal(result.status, 200);
    assert.equal(result.body.configured, false);
    assert.equal(result.body.authenticated, false);
  } finally {
    if (old === undefined) delete process.env.NAMANA_GITHUB_TOKEN;
    else process.env.NAMANA_GITHUB_TOKEN = old;
  }
});

test("Studio rejects cross-origin mutations before reading credentials", async () => {
  const result = await invoke("POST", "publish", {
    origin: "https://attacker.example",
    host: "namanapro.vercel.app",
  });
  assert.equal(result.status, 403);
  assert.match(result.body.error || "", /ditolak/);
});
