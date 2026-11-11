// Auth transport is simulated. RPCs and table reads execute the real migration with SQL RLS.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { BrowserContext } from "@playwright/test";
import { defaultContent } from "../../src/domain/content";
import { inspectMedia } from "../../server/media";
import { createServer } from "node:http";
export const users = {
  admin: "10000000-0000-4000-8000-000000000001",
  a: "20000000-0000-4000-8000-000000000001",
  b: "30000000-0000-4000-8000-000000000001",
  c: "40000000-0000-4000-8000-000000000001",
};
export async function backend(context: BrowserContext) {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
  await db.exec(
    await readFile("supabase/migrations/202611070001_namana.sql", "utf8"),
  );
  for (const [name, id] of Object.entries(users))
    await db.query("insert into auth.users values($1,$2)", [
      id,
      `${name}@example.test`,
    ]);
  await db.query("insert into namana_roles values($1,'superadmin')", [
    users.admin,
  ]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    users.admin,
  ]);
  for (const name of ["a", "b"] as const)
    await db.query("select namana_provision($1,$2,$3)", [
      users[name],
      `client-${name}`,
      defaultContent,
    ]);
  let queue: Promise<unknown> = Promise.resolve();
  let failSave = false;
  const uploads = new Map<string, Buffer>();
  // Use actual HTTP for multipart: browser debugging protocols may omit binary file bytes.
  const storageServer = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const work = async () => {
      try {
        const id = JSON.parse(
          Buffer.from(
            (req.headers.authorization || "").split(".")[1],
            "base64url",
          ).toString(),
        ).sub;
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          id,
        ]);
        await db.exec("set role authenticated");
        const path = decodeURIComponent(
          req.url!.slice("/storage/v1/object/namana-media/".length),
        );
        const form = await new Response(Buffer.concat(chunks), {
          headers: { "content-type": req.headers["content-type"]! },
        }).formData();
        const file = [...form.values()].find(
          (value) => typeof value !== "string",
        );
        if (!file || typeof file === "string") throw Error("invalid file");
        await db.query(
          "insert into storage.objects(bucket_id,name) values('namana-media',$1)",
          [path],
        );
        uploads.set(path, Buffer.from(await file.arrayBuffer()));
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            Key: `namana-media/${path}`,
            Id: crypto.randomUUID(),
          }),
        );
      } catch {
        res
          .writeHead(400)
          .end(JSON.stringify({ message: "fixture storage upload failed" }));
      }
    };
    queue = queue.then(work, work);
    await queue;
  });
  await new Promise<void>((resolve) =>
    storageServer.listen(0, "127.0.0.1", resolve),
  );
  const storageOrigin = `http://127.0.0.1:${(storageServer.address() as { port: number }).port}`;
  const userRecord = (id: string) => ({
    id,
    aud: "authenticated",
    role: "authenticated",
    email: `${Object.entries(users).find(([, v]) => v === id)?.[0]}@example.test`,
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  });
  const jwt = (id: string) =>
    [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
        "base64url",
      ),
      Buffer.from(
        JSON.stringify({
          sub: id,
          exp: Math.floor(Date.now() / 1000) + 3600,
          role: "authenticated",
        }),
      ).toString("base64url"),
      "test-signature",
    ].join(".");
  await context.route("http://127.0.0.1:54321/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname.startsWith("/storage/v1/object/namana-media/"))
      return route.continue({ url: storageOrigin + url.pathname });
    let id = "";
    try {
      id = JSON.parse(
        Buffer.from(
          (request.headers().authorization || "").split(".")[1],
          "base64url",
        ).toString(),
      ).sub;
    } catch {}
    const send = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (url.pathname.endsWith("/token")) {
      const body = request.postDataJSON();
      const user = Object.entries(users).find(
        ([n]) => `${n}@example.test` === body.email,
      );
      if (!user || body.password !== "Testing-only-123")
        return send({ error: "invalid_credentials" }, 400);
      return send({
        access_token: jwt(user[1]),
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: `test-${user[0]}`,
        user: userRecord(user[1]),
      });
    }
    if (url.pathname.endsWith("/logout")) return send({});
    if (url.pathname.endsWith("/user"))
      return id ? send(userRecord(id)) : send({ error: "invalid_token" }, 401);
    if (url.pathname.endsWith("/recover")) return send({});
    const work = async () => {
      try {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          id,
        ]);
        await db.exec(`set role ${id ? "authenticated" : "anon"}`);
        if (url.pathname.startsWith("/test-media/")) {
          await db.exec("reset role");
          const row = await db.query<{ storage_path: string; mime: string }>(
            "select storage_path,mime from namana_assets where id=$1",
            [url.pathname.split("/").at(-1)],
          );
          const bytes = uploads.get(row.rows[0]?.storage_path);
          if (!bytes) return send({ message: "not found" }, 404);
          return route.fulfill({ contentType: row.rows[0].mime, body: bytes });
        }
        if (url.pathname.includes("/rpc/")) {
          const fn = url.pathname.split("/").at(-1)!;
          if (!/^namana_[a-z_]+$/.test(fn)) throw Error("invalid function");
          if (fn === "namana_save" && failSave)
            throw Error("Simulasi koneksi gagal");
          const args = request.postDataJSON() || {};
          const entries = Object.entries(args);
          if (!entries.every(([key]) => /^p_[a-z_]+$/.test(key)))
            throw Error("invalid args");
          const result = await db.query<Record<string, unknown>>(
            `select public.${fn}(${entries.map(([key], i) => `${key} => $${i + 1}`).join(",")})`,
            entries.map(([, v]) => v),
          );
          return send(Object.values(result.rows[0])[0] ?? null);
        }
        const table = url.pathname.split("/").at(-1)!;
        if (!/^namana_[a-z_]+$/.test(table)) throw Error("invalid table");
        const args: unknown[] = [];
        const filters: string[] = [];
        for (const [key, value] of url.searchParams) {
          if (["select", "order", "limit"].includes(key)) continue;
          if (!/^[a-z_]+$/.test(key) || !value.startsWith("eq."))
            throw Error("invalid filter");
          args.push(value.slice(3));
          filters.push(`${key}=$${args.length}`);
        }
        const result = await db.query(
          `select * from public.${table}${filters.length ? " where " + filters.join(" and ") : ""}`,
          args,
        );
        if (request.headers().accept?.includes("vnd.pgrst.object"))
          return result.rows.length === 1
            ? send(result.rows[0])
            : send({ message: "not found" }, 406);
        return send(result.rows);
      } catch (error) {
        return send({ message: (error as Error).message, code: "P0001" }, 400);
      }
    };
    queue = queue.then(work, work);
    await queue;
  });
  await context.route("http://127.0.0.1:5174/api/operations", async (route) => {
    const work = async () => {
      try {
        const request = route.request();
        const body = request.postDataJSON();
        let id = "";
        try {
          id = JSON.parse(
            Buffer.from(
              (request.headers().authorization || "").split(".")[1],
              "base64url",
            ).toString(),
          ).sub;
        } catch {}
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          id,
        ]);
        await db.exec(`set role ${id ? "authenticated" : "anon"}`);
        let response: unknown = { ok: true };
        if (body.action === "media") {
          const result = await db.query<{ path: string }>(
            "select namana_asset_access($1,$2) path",
            [body.payload.id, body.payload.token || null],
          );
          if (!result.rows[0].path) throw Error("forbidden");
          response = {
            url: `http://127.0.0.1:54321/test-media/${body.payload.id}`,
          };
        } else {
          const result = await db.query<{
            id: string;
            storage_path: string;
            mime: string;
            bytes: number;
          }>("select * from namana_assets where id=$1", [body.payload.id]);
          const asset = result.rows[0];
          if (!asset) throw Error("forbidden");
          if (body.action === "finalize") {
            const settings = (
              await db.query<import("../../server/media").MediaLimits>(
                "select * from namana_settings",
              )
            ).rows[0];
            const buffer = uploads.get(asset.storage_path);
            if (!buffer || buffer.length !== asset.bytes)
              throw Error("invalid_file");
            const meta = await inspectMedia(buffer, asset.mime, settings);
            await db.exec("reset role");
            await db.query(
              "update namana_assets set verified=true,metadata=$2 where id=$1",
              [asset.id, meta],
            );
          } else if (body.action === "cancel") {
            uploads.delete(asset.storage_path);
            await db.exec("reset role");
            await db.query(
              "delete from namana_assets where id=$1 and not verified",
              [asset.id],
            );
          } else throw Error("unsupported fixture action");
        }
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(response),
        });
      } catch (error) {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: (error as Error).message }),
        });
      }
    };
    queue = queue.then(work, work);
    await queue;
  });
  return {
    db,
    failSaves: (value: boolean) => {
      failSave = value;
    },
    close: async () => {
      await queue;
      await new Promise<void>((resolve) =>
        storageServer.close(() => resolve()),
      );
      await db.close();
    },
  };
}
