import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, chmodSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const deployScript = resolve("scripts/deploy-cpanel-safe.sh");

type Fixture = { root: string; build: string; docroot: string; privateDir: string };

function testWithSite(callback: (site: Fixture) => void) {
  const root = mkdtempSync(join(tmpdir(), "namina-cpanel-"));
  const build = join(root, "hosting-dist");
  const docroot = join(root, "public_html");
  const privateDir = join(root, "namina-private");
  try {
    for (const path of [
      build, docroot, privateDir, join(build, "generator"), join(build, "api"),
      join(build, "assets"), join(build, "clients"), join(docroot, "api"),
      join(docroot, "clients"), join(docroot, "nadira"), join(docroot, "namina.biz.id"),
    ]) mkdirSync(path, { recursive: true });
    writeFileSync(join(build, "index.html"), "UPDATED LANDING");
    writeFileSync(join(build, "generator/index.html"), "UPDATED GENERATOR");
    writeFileSync(join(build, "api/generator.php"), "<?php // UPDATED");
    writeFileSync(join(build, "api/generator-lib.php"), "<?php // LIBRARY");
    writeFileSync(join(build, "api/.htaccess"), "Require all denied");
    writeFileSync(join(build, "assets/new.js"), "NEW JAVASCRIPT");
    writeFileSync(join(build, "clients/vini.json"), "NEW SEED SHOULD NEVER DEPLOY");
    writeFileSync(join(docroot, "index.html"), "EXISTING LANDING");
    writeFileSync(join(docroot, "api/generator.php"), "<?php // OLD");
    writeFileSync(join(docroot, "clients/vini.json"), "PUBLISHED VINI");
    writeFileSync(join(docroot, "clients/nadira.json"), "PUBLISHED NADIRA");
    writeFileSync(join(docroot, "nadira/index.html"), "NADIRA PUBLISHED");
    writeFileSync(join(docroot, "namina.biz.id/index.html"), "OTHER DIRECTORY");
    writeFileSync(join(docroot, "php.ini"), "CUSTOM PHP CONFIG");
    writeFileSync(join(docroot, "namina-deploy-check.txt"), "NAMINA-DEPLOY-TARGET\n");
    callback({ root, build, docroot, privateDir });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function run(site: Fixture, action: "--check" | "--apply", approved = false) {
  return spawnSync("bash", [deployScript, action], {
    encoding: "utf8",
    env: {
      ...process.env,
      NAMINA_CPANEL_FIXTURE_MODE: "ci-test",
      NAMINA_TEST_BUILD: site.build,
      NAMINA_TEST_DOCROOT: site.docroot,
      NAMINA_TEST_PRIVATE: site.privateDir,
      NAMINA_CPANEL_APPROVE_PRODUCTION: approved ? "YES_DEPLOY_NAMINA" : "",
    },
  });
}

test("safe preflight is read-only, and wrong domain marker is rejected", () => testWithSite((site) => {
  const result = run(site, "--check");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CHECK ONLY: no production files changed/);
  assert.equal(readFileSync(join(site.docroot, "index.html"), "utf8"), "EXISTING LANDING");
  assert.equal(existsSync(join(site.privateDir, "deploy-backups")), false);
  writeFileSync(join(site.docroot, "namina-deploy-check.txt"), "WRONG TARGET");
  assert.notEqual(run(site, "--check").status, 0);
}));

test("app-only deploy requires approval, backs up overwritten files, preserves clients", () => testWithSite((site) => {
  assert.notEqual(run(site, "--apply").status, 0);
  assert.equal(readFileSync(join(site.docroot, "index.html"), "utf8"), "EXISTING LANDING");
  // Simulate a cPanel/Git worker that checked out public assets as private files.
  chmodSync(join(site.build, "assets/new.js"), 0o600);
  chmodSync(join(site.build, "assets"), 0o700);
  const result = run(site, "--apply", true);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(statSync(join(site.docroot, "assets")).mode & 0o777, 0o755);
  assert.equal(statSync(join(site.docroot, "assets/new.js")).mode & 0o777, 0o644);
  assert.equal(statSync(join(site.docroot, "generator/index.html")).mode & 0o777, 0o644);
  assert.equal(statSync(join(site.docroot, "index.html")).mode & 0o777, 0o644);
  assert.equal(readFileSync(join(site.docroot, "index.html"), "utf8"), "UPDATED LANDING");
  assert.equal(readFileSync(join(site.docroot, "api/generator.php"), "utf8"), "<?php // UPDATED");
  assert.equal(readFileSync(join(site.docroot, "generator/index.html"), "utf8"), "UPDATED GENERATOR");
  assert.equal(readFileSync(join(site.docroot, "clients/vini.json"), "utf8"), "PUBLISHED VINI");
  assert.equal(readFileSync(join(site.docroot, "clients/nadira.json"), "utf8"), "PUBLISHED NADIRA");
  assert.equal(readFileSync(join(site.docroot, "nadira/index.html"), "utf8"), "NADIRA PUBLISHED");
  assert.equal(readFileSync(join(site.docroot, "namina.biz.id/index.html"), "utf8"), "OTHER DIRECTORY");
  assert.equal(readFileSync(join(site.docroot, "php.ini"), "utf8"), "CUSTOM PHP CONFIG");
  const backups = readdirSync(join(site.privateDir, "deploy-backups"));
  assert.equal(backups.length, 1);
  assert.ok(existsSync(join(site.privateDir, "deploy-backups", backups[0], "overwritten-files.tar.gz")));
}));

test("an incomplete build is blocked before writing", () => testWithSite((site) => {
  rmSync(join(site.build, "api/generator-lib.php"));
  assert.notEqual(run(site, "--apply", true).status, 0);
  assert.equal(readFileSync(join(site.docroot, "index.html"), "utf8"), "EXISTING LANDING");
  assert.equal(existsSync(join(site.privateDir, "deploy-backups")), false);
}));


test("deployment does not require /dev/fd process substitution on cPanel", () => {
  const source = readFileSync(deployScript, "utf8");
  assert.doesNotMatch(source, /done\s*<\s*<\(/);
  assert.match(source, /done\s*<\s*"\$paths"/);
  assert.match(source, /find "\$entry" -type f -print0 > "\$paths"/);
});
