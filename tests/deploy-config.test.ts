import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
    mkdirSync(join(build, "assets"));
    mkdirSync(join(build, "clients"));
    mkdirSync(bin);
    writeFileSync(join(build, "index.html"), "<!doctype html>");
    writeFileSync(join(build, "api/generator.php"), "<?php");
    writeFileSync(join(build, "api/.htaccess"), "Require all denied");
    writeFileSync(join(build, "assets/app.js"), "console.log('ok')");
    writeFileSync(join(build, "clients/vini.json"), "{}");
    writeFileSync(join(build, "clients/nadira.json"), "{\"private\":true}");
    const mock = join(bin, "lftp");
    writeFileSync(
      mock,
      `#!/bin/bash
payload="$(cat)"
printf '%s\\n' "$payload" >> "$NAMINA_CAPTURE_LFTP"
if [[ "$payload" == *'cat namina-deploy-check.txt'* ]]; then
  printf '%s\\n' "\${NAMINA_MOCK_MARKER:-NAMINA-DEPLOY-TARGET}"
fi
if [[ "$payload" == *'mirror -R '* ]]; then
  stage="$(printf '%s\\n' "$payload" | sed -n 's/^mirror -R .*"\\([^"]*\\)" \\/$/\\1/p')"
  if [[ -d "$stage" ]]; then (cd "$stage" && find . -type f | sort) >> "$NAMINA_CAPTURE_STAGE"; fi
fi
`,
      { mode: 0o755 },
    );
    run({ root, build, bin });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function environment(root: string, bin: string) {
  return {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    NAMINA_FTPS_HOST: "ftp.example.test",
    NAMINA_FTPS_PORT: "21",
    NAMINA_FTPS_USER: "namina_deploy@example.test",
    NAMINA_FTPS_PASSWORD: "mock-secret",
    NAMINA_CAPTURE_LFTP: join(root, "lftp-commands.txt"),
    NAMINA_CAPTURE_STAGE: join(root, "staged-files.txt"),
  };
}

test("FTPS deploy uploads the tested site without client data loss or remote deletion", () => {
  withFixture(({ root, build, bin }) => {
    const env = environment(root, bin);
    const result = spawnSync("bash", [script, build], { env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);

    const commands = readFileSync(env.NAMINA_CAPTURE_LFTP, "utf8");
    assert.match(commands, /set ftp:ssl-force true/);
    assert.match(commands, /set ftp:ssl-protect-data true/);
    assert.match(commands, /set ssl:verify-certificate true/);
    assert.match(commands, /set ssl:check-hostname true/);
    assert.match(commands, /cat namina-deploy-check\.txt/);
    assert.match(commands, /mirror -R --no-perms/);
    assert.doesNotMatch(commands, /--delete/);

    const staged = readFileSync(env.NAMINA_CAPTURE_STAGE, "utf8");
    assert.match(staged, /\.\/index\.html/);
    assert.match(staged, /\.\/api\/generator\.php/);
    assert.match(staged, /\.\/api\/\.htaccess/);
    assert.match(staged, /\.\/assets\/app\.js/);
    assert.match(staged, /\.\/clients\/vini\.json/);
    assert.doesNotMatch(staged, /nadira\.json/);
  });
});

test("deployment refuses an unexpected remote directory marker before uploading", () => {
  withFixture(({ root, build, bin }) => {
    const env = { ...environment(root, bin), NAMINA_MOCK_MARKER: "ANOTHER-SITE" };
    const result = spawnSync("bash", [script, build], { env, encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /FTPS target check failed/);
    assert.doesNotMatch(readFileSync(env.NAMINA_CAPTURE_LFTP, "utf8"), /mirror -R/);
    assert.equal(existsSync(env.NAMINA_CAPTURE_STAGE), false);
  });
});

test("deployment refuses invalid host settings and missing secrets", () => {
  withFixture(({ root, build, bin }) => {
    const env = environment(root, bin);
    const unsafeHost = spawnSync("bash", [script, build], {
      env: { ...env, NAMINA_FTPS_HOST: "ftp://other.example" },
      encoding: "utf8",
    });
    assert.notEqual(unsafeHost.status, 0);
    assert.match(unsafeHost.stderr, /Invalid NAMINA_FTPS_HOST/);

    const withoutPassword = { ...env };
    delete (withoutPassword as Partial<typeof env>).NAMINA_FTPS_PASSWORD;
    const missingSecret = spawnSync("bash", [script, build], { env: withoutPassword, encoding: "utf8" });
    assert.notEqual(missingSecret.status, 0);
    assert.match(missingSecret.stderr, /Missing GitHub Actions secret/);
    assert.equal(existsSync(env.NAMINA_CAPTURE_LFTP), false);
  });
});
