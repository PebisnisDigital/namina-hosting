import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { defaultContent } from "../src/domain/content.ts";

test("migration: real SQL roles, RLS, ownership, snapshots, concurrency, preview, suspension and media", async (t) => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202611070001_namana.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../supabase/inspect-namana.sql", import.meta.url),
      "utf8",
    ),
  );
  const admin = "10000000-0000-4000-8000-000000000001",
    a = "20000000-0000-4000-8000-000000000001",
    b = "30000000-0000-4000-8000-000000000001";
  await db.query(
    "insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)",
    [admin, "admin@example.test", a, "a@example.test", b, "b@example.test"],
  );
  await db.query(
    "insert into namana_roles(user_id,role) values($1,'superadmin')",
    [admin],
  );
  async function as(user: string, role = "authenticated") {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user,
    ]);
    await db.exec(`set role ${role}`);
  }
  async function scalar(sql: string, args: unknown[] = []) {
    const r = await db.query<Record<string, unknown>>(sql, args);
    return Object.values(r.rows[0] || {})[0];
  }
  await as(admin);
  const siteA = await scalar("select namana_provision($1,$2,$3)", [
    a,
    "client-a",
    defaultContent,
  ]);
  const siteB = await scalar("select namana_provision($1,$2,$3)", [
    b,
    "client-b",
    defaultContent,
  ]);
  await t.test(
    "one site per client, reserved slug and client cannot provision or escalate",
    async () => {
      await assert.rejects(
        db.query("select namana_provision($1,$2,$3)", [
          a,
          "duplicate",
          defaultContent,
        ]),
      );
      await assert.rejects(
        db.query("select namana_provision($1,$2,$3)", [
          admin,
          "admin",
          defaultContent,
        ]),
      );
      await as(a);
      await assert.rejects(
        db.query("select namana_provision($1,$2,$3)", [
          b,
          "another",
          defaultContent,
        ]),
      );
      await assert.rejects(
        db.query("insert into namana_roles values($1,'superadmin')", [a]),
      );
    },
  );
  await t.test(
    "A cannot read or mutate B; direct client table writes denied",
    async () => {
      await as(a);
      assert.equal(
        (
          await db.query("select * from namana_drafts where site_id=$1", [
            siteB,
          ])
        ).rows.length,
        0,
      );
      assert.equal(
        (await db.query("select * from namana_sites")).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from namana_profiles")).rows.length,
        1,
      );
      await assert.rejects(
        db.query("select namana_save($1,1,$2)", [siteB, defaultContent]),
      );
      await assert.rejects(
        db.query("update namana_sites set owner_id=$1", [a]),
      );
      await assert.rejects(db.query("select namana_publish($1,1)", [siteB]));
    },
  );
  let firstVersion: unknown;
  let next = structuredClone(defaultContent);
  next.identity.displayName = "Klien A";
  await t.test(
    "save and stale revision conflict; public reads only immutable published snapshot",
    async () => {
      assert.equal(
        await scalar("select namana_save($1,1,$2)", [siteA, next]),
        2,
      );
      await assert.rejects(
        db.query("select namana_save($1,1,$2)", [siteA, defaultContent]),
        /revision_conflict/,
      );
      firstVersion = await scalar("select namana_publish($1,2)", [siteA]);
      await assert.rejects(db.query("update namana_versions set content='{}'"));
      next = structuredClone(next);
      next.identity.displayName = "Draft berikutnya";
      assert.equal(
        await scalar("select namana_save($1,2,$2)", [siteA, next]),
        3,
      );
      await as("", "anon");
      const pub = (await scalar("select namana_public_site($1)", [
        "client-a",
      ])) as { content: typeof defaultContent };
      assert.equal(pub.content.identity.displayName, "Klien A");
      await assert.rejects(db.query("select * from namana_drafts"));
      await as(a);
    },
  );
  await t.test(
    "restore creates new draft and keeps version history; cross-site restore denied",
    async () => {
      await assert.rejects(
        db.query("select namana_restore($1,$2,1)", [siteB, firstVersion]),
      );
      assert.equal(
        await scalar("select namana_restore($1,$2,3)", [siteA, firstVersion]),
        4,
      );
      assert.equal(
        await scalar("select count(*) from namana_versions where site_id=$1", [
          siteA,
        ]),
        1,
      );
    },
  );
  await t.test(
    "preview is hashed, expiring, revision-specific and revocable",
    async () => {
      const token = (await scalar("select namana_create_preview($1,4)", [
        siteA,
      ])) as string;
      assert.equal(token.length, 64);
      assert.ok(
        !JSON.stringify(
          (await db.query("select * from namana_preview_tokens")).rows,
        ).includes(token),
      );
      await as("", "anon");
      assert.ok(await scalar("select namana_preview($1)", [token]));
      assert.equal(
        await scalar("select namana_preview($1)", ["invalid"]),
        null,
      );
      await as(b);
      await assert.rejects(
        db.query("select namana_revoke_previews($1)", [siteA]),
      );
      await as(a);
      await db.query("select namana_revoke_previews($1)", [siteA]);
      await as("", "anon");
      assert.equal(await scalar("select namana_preview($1)", [token]), null);
      await as(a);
    },
  );
  await t.test(
    "server rejects malicious schema, links and out-of-site assets",
    async () => {
      const invalid = structuredClone(defaultContent);
      invalid.cards[0].link = "javascript:alert(1)";
      await assert.rejects(
        db.query("select namana_save($1,4,$2)", [siteA, invalid]),
        /invalid_card/,
      );
      invalid.cards[0].link = "";
      invalid.background.posterAssetId = "90000000-0000-4000-8000-000000000001";
      await assert.rejects(
        db.query("select namana_save($1,4,$2)", [siteA, invalid]),
        /invalid_asset_ownership/,
      );
    },
  );
  let assetA: { id: string; storage_path: string };
  await t.test(
    "storage insert and asset access scoped by site; quotas and MIME enforced",
    async () => {
      assetA = (await scalar("select namana_reserve_asset($1,$2,$3)", [
        siteA,
        "image/png",
        100,
      ])) as typeof assetA;
      await db.query(
        "insert into storage.objects(bucket_id,name) values('namana-media',$1)",
        [assetA.storage_path],
      );
      await assert.rejects(
        db.query("select namana_reserve_asset($1,$2,$3)", [
          siteB,
          "image/png",
          100,
        ]),
      );
      await assert.rejects(
        db.query("select namana_reserve_asset($1,$2,$3)", [
          siteA,
          "text/html",
          100,
        ]),
      );
      await assert.rejects(
        db.query("select namana_reserve_asset($1,$2,$3)", [
          siteA,
          "video/mp4",
          999999999,
        ]),
      );
      await as(b);
      assert.equal(
        (await db.query("select * from namana_assets")).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values('namana-media',$1)",
          [assetA.storage_path],
        ),
      );
      assert.equal(
        await scalar("select namana_asset_access($1,null)", [assetA.id]),
        null,
      );
      await as(a);
    },
  );
  await t.test(
    "suspension removes public page and prevents publish; admin actions audited",
    async () => {
      await as(admin);
      await db.query("select namana_admin_site($1,$2,$3,$4)", [
        siteA,
        "client-a",
        "suspended",
        "QA test",
      ]);
      await as(a);
      await assert.rejects(
        db.query("select namana_publish($1,4)", [siteA]),
        /site_suspended/,
      );
      await as("", "anon");
      assert.equal(
        await scalar("select namana_public_site($1)", ["client-a"]),
        null,
      );
      await as(admin);
      assert.ok(Number(await scalar("select count(*) from namana_audit")) >= 6);
    },
  );
  await t.test(
    "expired preview, malformed schema, cross-site media, quota and RPC rate limits reject direct requests",
    async () => {
      await as(b);
      const foreign = (await scalar("select namana_reserve_asset($1,$2,$3)", [
        siteB,
        "image/png",
        100,
      ])) as { id: string };
      await db.exec("reset role");
      await db.query("update namana_assets set verified=true where id=$1", [
        foreign.id,
      ]);
      await as(a);
      const content = structuredClone(defaultContent);
      content.identity.portraitAssetId = foreign.id;
      await assert.rejects(
        db.query("select namana_save($1,4,$2)", [siteA, content]),
        /invalid_asset_ownership/,
      );
      const invalid = { ...defaultContent, untrusted: "<script>" };
      await assert.rejects(
        db.query("select namana_save($1,4,$2)", [siteA, invalid]),
        /invalid_content_keys/,
      );
      await as(b);
      const token = await scalar("select namana_create_preview($1,1)", [siteB]);
      await db.exec("reset role");
      await db.exec(
        "update namana_preview_tokens set expires_at=now()-interval '1 second'",
      );
      await as("", "anon");
      assert.equal(await scalar("select namana_preview($1)", [token]), null);
      await as(b);
      for (let i = 0; i < 4; i++)
        await db.query("select namana_reserve_asset($1,$2,$3)", [
          siteB,
          "video/mp4",
          20971520,
        ]);
      await assert.rejects(
        db.query("select namana_reserve_asset($1,$2,$3)", [
          siteB,
          "video/mp4",
          20971520,
        ]),
        /quota_exceeded/,
      );
      await db.exec("reset role");
      await db.query(
        "update namana_rpc_limits set requests=180,window_at=now() where user_id=$1",
        [b],
      );
      await as(b);
      await assert.rejects(
        db.query("select namana_save($1,1,$2)", [siteB, defaultContent]),
        /rate_limit/,
      );
    },
  );
  await db.close();
});
