import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const launcher = join(dirname(fileURLToPath(import.meta.url)), "pstack-auth-launcher.sh");
const probe = `#!/usr/bin/env node
console.log(JSON.stringify({
  key: process.env.ANTHROPIC_API_KEY ?? null,
  token: process.env.ANTHROPIC_AUTH_TOKEN ?? null,
  baseUrl: process.env.ANTHROPIC_BASE_URL ?? null,
  claudeConfig: process.env.CLAUDE_CONFIG_DIR ?? null,
  providerConfig: process.env.PI_CLAUDE_CODE_CONFIG_DIR ?? null,
  openaiKey: process.env.OPENAI_API_KEY ?? null,
  args: process.argv.slice(2)
}));
`;

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "pstack-env-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const bin = join(root, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "pstack-auth-launcher"), readFileSync(launcher));
  chmodSync(join(bin, "pstack-auth-launcher"), 0o755);
  for (const name of ["pi", "claude"]) {
    symlinkSync("pstack-auth-launcher", join(bin, name));
    writeFileSync(join(bin, name + ".pstack-upstream"), probe);
    chmodSync(join(bin, name + ".pstack-upstream"), 0o755);
  }
  return bin;
}

function run(bin, name, env = {}, args = ["a b"], viaPath = false) {
  return spawnSync(viaPath ? name : join(bin, name), args, {
    env: {
      PATH: bin + ":" + process.env.PATH,
      ANTHROPIC_API_KEY: "proxy-managed",
      ...env,
    },
    encoding: "utf8",
  });
}

function output(call) {
  assert.equal(call.status, 0, call.stderr);
  return JSON.parse(call.stdout.trim());
}

test("both Pi and Claude clear the injected key without changing other variables", t => {
  const bin = fixture(t);
  const env = {
    ANTHROPIC_AUTH_TOKEN: "unchanged",
    ANTHROPIC_BASE_URL: "http://127.0.0.1:52141/turn/internal-relay",
    CLAUDE_CONFIG_DIR: "/already/configured",
    PI_CLAUDE_CODE_CONFIG_DIR: "/provider/config",
    OPENAI_API_KEY: "openai-proxy-managed",
  };
  for (const name of ["pi", "claude"]) {
    const got = output(run(bin, name, env, ["spaced argument", "--flag"]));
    assert.equal(got.key, null);
    assert.equal(got.token, env.ANTHROPIC_AUTH_TOKEN);
    assert.equal(got.baseUrl, env.ANTHROPIC_BASE_URL);
    assert.equal(got.claudeConfig, env.CLAUDE_CONFIG_DIR);
    assert.equal(got.providerConfig, env.PI_CLAUDE_CODE_CONFIG_DIR);
    assert.equal(got.openaiKey, env.OPENAI_API_KEY);
    assert.deepEqual(got.args, ["spaced argument", "--flag"]);
  }
});

test("the key is cleared even when set to a real API key", t => {
  const bin = fixture(t);
  assert.equal(output(run(bin, "pi", { ANTHROPIC_API_KEY: "real-api-key" })).key, null);
  assert.equal(output(run(bin, "claude", { ANTHROPIC_API_KEY: "real-api-key" })).key, null);
});

test("PATH invocation and the upstream exit status are preserved", t => {
  const bin = fixture(t);
  assert.equal(output(run(bin, "pi", {}, ["via PATH"], true)).key, null);
  writeFileSync(join(bin, "claude.pstack-upstream"), "#!/bin/sh\nexit 37\n");
  chmodSync(join(bin, "claude.pstack-upstream"), 0o755);
  assert.equal(run(bin, "claude").status, 37);
});
