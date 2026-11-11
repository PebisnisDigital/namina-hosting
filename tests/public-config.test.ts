import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import handler from "../api/site.ts";

test("public site API uses existing publishable key and URL without duplicate server/anon variables", async () => {
  let key = "";
  let authorization: string | undefined;
  const backend = createServer((req, res) => {
    key = String(req.headers.apikey);
    authorization = req.headers.authorization;
    res.writeHead(200, { "Content-Type": "application/json" }).end("null");
  });
  await new Promise<void>((resolve) => backend.listen(0, "127.0.0.1", resolve));
  const names = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_URL",
  ];
  const original = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  process.env.VITE_SUPABASE_URL = `http://127.0.0.1:${(backend.address() as { port: number }).port}`;
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_local_test_key";
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  const response = { status: 200, body: "" };
  const res = {
    setHeader() {},
    writeHead(status: number) {
      response.status = status;
      return res;
    },
    end(body: string) {
      response.body = body;
    },
  };
  try {
    await handler(
      { query: { slug: "not-published" } } as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );
    assert.equal(response.status, 404); // Lookup succeeded; no published site exists in the transport fixture.
    assert.equal(key, "sb_publishable_local_test_key");
    assert.ok(authorization === undefined || authorization === `Bearer ${key}`);
    process.env.SUPABASE_URL = "https://another-project.example.test";
    await handler(
      { query: { slug: "not-published" } } as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );
    assert.equal(response.status, 503);
  } finally {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
    await new Promise<void>((resolve) => backend.close(() => resolve()));
  }
});
