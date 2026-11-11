import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import sharp from "sharp";
import handler from "../api/operations.ts";

test("server API: no browser-trusted admin, authenticated media validation, and signed public asset authorization", async () => {
  const assetId = "90000000-0000-4000-8000-000000000001";
  const bytes = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#806020" },
  })
    .png()
    .toBuffer();
  let verified = false;
  let allowAsset = true;
  let lastInviteAuth = "";
  let publicApiKey = "";
  let publicAuthorization: string | undefined;
  let sessionAuthorization: string | undefined;
  let rateError = "";
  const backend = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://test");
    res.setHeader("Content-Type", "application/json");
    const respond = (body: unknown, status = 200) => {
      res.writeHead(status).end(JSON.stringify(body));
    };
    if (url.pathname === "/rest/v1/rpc/namana_api_rate")
      return rateError
        ? respond({ message: rateError, code: "P0001" }, 400)
        : respond(null);
    if (url.pathname === "/auth/v1/user") {
      sessionAuthorization = req.headers.authorization;
      return respond({
        id: "20000000-0000-4000-8000-000000000001",
        email: "a@example.test",
      });
    }
    if (url.pathname === "/rest/v1/rpc/namana_is_admin") return respond(false);
    if (url.pathname === "/auth/v1/invite") {
      lastInviteAuth = req.headers.authorization || "";
      return respond({});
    }
    if (url.pathname === "/rest/v1/rpc/namana_asset_access") {
      publicApiKey = String(req.headers.apikey);
      publicAuthorization = req.headers.authorization;
      return respond(allowAsset ? "site/file.png" : null);
    }
    if (url.pathname === "/storage/v1/object/sign/namana-media/site/file.png")
      return respond({
        signedURL: "/object/sign/namana-media/site/file.png?token=local-test",
      });
    if (url.pathname === "/rest/v1/namana_assets") {
      if (req.method === "PATCH") {
        verified = true;
        return respond(null);
      }
      return respond({
        id: assetId,
        site_id: "50000000-0000-4000-8000-000000000001",
        storage_path: "site/file.png",
        mime: "image/png",
        bytes: bytes.length,
        verified,
      });
    }
    if (url.pathname === "/rest/v1/namana_settings")
      return respond({
        image_bytes: 5242880,
        video_bytes: 20971520,
        max_dimension: 3840,
        max_video_seconds: 120,
      });
    if (url.pathname === "/storage/v1/object/namana-media/site/file.png") {
      res.setHeader("Content-Type", "image/png");
      res.end(bytes);
      return;
    }
    respond({ message: "Unexpected test request" }, 404);
  });
  await new Promise<void>((resolve) => backend.listen(0, "127.0.0.1", resolve));
  const address = backend.address() as { port: number };
  const names = [
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "APP_ORIGIN",
  ];
  const before = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  const url = `http://127.0.0.1:${address.port}`;
  Object.assign(process.env, {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test_key",
    SUPABASE_SERVICE_ROLE_KEY: "local-test-server-key",
    APP_ORIGIN: "https://namana.example.test",
  });
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  async function call(
    action: string,
    payload: unknown,
    authorization = "Bearer local-test-user",
  ) {
    let status = 200,
      body = "";
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      writeHead: (s: number) => {
        status = s;
        return res;
      },
      end: (s: string) => {
        body = s;
      },
    };
    await handler(
      {
        method: "POST",
        headers: { authorization },
        socket: { remoteAddress: "127.0.0.1" },
        body: { action, payload },
      } as unknown as IncomingMessage & { body: unknown },
      res as unknown as ServerResponse,
    );
    return { status, body: JSON.parse(body), headers };
  }
  try {
    const invite = await call("invite", {
      email: "victim@example.test",
      name: "Client",
    });
    assert.equal(invite.status, 403);
    assert.equal(sessionAuthorization, "Bearer local-test-user");
    assert.equal(lastInviteAuth, "");
    const finalize = await call("finalize", { id: assetId });
    assert.equal(finalize.status, 200);
    assert.equal(verified, true);
    const publicMedia = await call("media", { id: assetId }, "");
    assert.equal(publicMedia.status, 200);
    assert.ok(publicMedia.body.url.includes("local-test"));
    assert.equal(publicApiKey, "sb_publishable_local_test_key");
    // Let the SDK choose its anonymous REST compatibility headers; never forward service privileges.
    assert.ok(
      publicAuthorization === undefined ||
        publicAuthorization === `Bearer ${publicApiKey}`,
    );
    assert.equal(publicMedia.headers["Cache-Control"], "private, no-store");
    allowAsset = false;
    assert.equal((await call("media", { id: assetId }, "")).status, 404);
    process.env.VITE_SUPABASE_ANON_KEY = "unused-legacy-key";
    allowAsset = true;
    assert.equal((await call("media", { id: assetId }, "")).status, 200);
    assert.equal(publicApiKey, "sb_publishable_local_test_key");
    rateError = "Could not find the function public.namana_api_rate";
    assert.equal((await call("finalize", { id: assetId })).status, 503);
    rateError = "rate_limit";
    assert.equal((await call("finalize", { id: assetId })).status, 429);
    rateError = "";
    process.env.SUPABASE_URL = "https://wrong-project.example.test";
    assert.equal((await call("finalize", { id: assetId })).status, 503);
  } finally {
    for (const k of names) {
      if (before[k] === undefined) delete process.env[k];
      else process.env[k] = before[k];
    }
    await new Promise<void>((resolve) => backend.close(() => resolve()));
  }
});
