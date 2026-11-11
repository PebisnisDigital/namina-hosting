import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const script = resolve("scripts/deploy-domainmurah.sh");

function withFixture(run: (data: { root: string; build: string; bin: string }) => void) {
  const root = mkdtempSync(join(tmpdir(), "namina-deploy-test-"));
  const build = join(root, "hosting-dist");
  const bin = join(root, "bin");
  try {
    mkdirSync(join(build, "api"), { recursive: true });
    mkdirSync(bin);
    writeFileSync(join(build, "index.html"), "<!doctype html>");
    writeFileSync(join(build, "api/generator.php"), "<?php");
    for (const command of ["ssh", "rsync"]) {
      const mock = join(bin, command);
      writeFileSync(mock, `#!/bin/sh\nprintf '%s\\n' "$@" > "$NAMINA_CAPTURE_${command.toUpperCase()}"\n`, { mode: 0o755 });
    }
    run({ root, build, bin });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function environment(root: string, bin: string) {
  return {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    NAMINA_SSH_HOST: "example.test",
    NAMINA_SSH_PORT: "22",
    NAMINA_SSH_USER: "namina93",
    NAMINA_SSH_PRIVATE_KEY: "mock-private-key",
    NAMINA_SSH_KNOWN_HOSTS: "example.test ssh-ed25519 mock-key",
    NAMINA_PUBLIC_HTML: "/home/namina93/public_html",
    NAMINA_CAPTURE_SSH: join(root, "ssh-args.txt"),
    NAMINA_CAPTURE_RSYNC: join(root, "rsync-args.txt"),
  };
}

test("whole-site deployment includes the build, preserves client records and never deletes files", () => {
  withFixture(({ root, build, bin }) => {
    const result = spawnSync("bash", [script, build], { env: environment(root, bin), encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const args = readFileSync(join(root, "rsync-args.txt"), "utf8");
    assert.match(args, /--include=\/clients\/vini\.json/);
    assert.match(args, /--exclude=\/clients\/\*\*\*/);
    assert.doesNotMatch(args, /--delete/);
    assert.match(args, /namina93@example\.test:\/home\/namina93\/public_html\//);
  });
});

test("deployment rejects unsafe destinations before connecting", () => {
  withFixture(({ root, build, bin }) => {
    const result = spawnSync("bash", [script, build], {
      env: { ...environment(root, bin), NAMINA_PUBLIC_HTML: "/home/namina93" },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Target must be/);
  });
});

test("deployment refuses missing SSH secrets", () => {
  withFixture(({ root, build, bin }) => {
    const env = environment(root, bin);
    delete (env as Partial<typeof env>).NAMINA_SSH_PRIVATE_KEY;
    const result = spawnSync("bash", [script, build], { env, encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing GitHub Actions secret/);
  });
});
