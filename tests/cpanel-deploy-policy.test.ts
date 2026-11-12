import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("cPanel deploy only calls guarded application deploy and never copies all hosting files", () => {
  const policy = readFileSync(".cpanel.yml", "utf8");
  assert.match(policy, /^deployment:\s*\n\s*tasks:/m);
  const tasks = policy.split("\n").filter((line) => /^\s*- /.test(line)).map((line) => line.trim().slice(2));
  assert.deepEqual(tasks, [
    "/bin/bash scripts/deploy-cpanel-safe.sh --check",
    "/usr/bin/env NAMINA_CPANEL_APPROVE_PRODUCTION=YES_DEPLOY_NAMINA /bin/bash scripts/deploy-cpanel-safe.sh --apply",
  ]);
  assert.doesNotMatch(policy, /\/bin\/cp -R hosting-dist\//);
  assert.doesNotMatch(policy, /public_html\/clients/);
});
