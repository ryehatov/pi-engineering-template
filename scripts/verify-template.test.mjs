#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const source = path.resolve(import.meta.dirname, "..");
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "pi-template-"));
  cpSync(source, root, {
    recursive: true,
    filter: file => ![".git", "node_modules"].includes(path.relative(source, file).split(path.sep)[0]),
  });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function verify(root) {
  const result = spawnSync(process.execPath, [path.join(root, "scripts/verify-template.mjs"), root], { encoding: "utf8" });
  assert.equal(result.error, undefined);
  return { code: result.status, output: result.stdout + result.stderr };
}
function mutate(root, name, edit) {
  const file = path.join(root, name);
  const obj = JSON.parse(readFileSync(file, "utf8"));
  edit(obj);
  writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
}
test("valid committed configuration succeeds", t => {
  const result = verify(fixture(t));
  assert.equal(result.code, 0, result.output);
});
test("legacy models.json Docker COPY is rejected", t => {
  const root = fixture(t), file = path.join(root, "Dockerfile");
  writeFileSync(file, readFileSync(file, "utf8") + "\nCOPY models.json /home/agent/.pi/agent/models.json\n");
  const result = verify(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /Docker provider, CLI dependency or timezone mismatch/);
});
for (const role of ["worker", "poteto-agent"]) {
  test(role + " must permit Astra for pstack synthesis", t => {
    const root = fixture(t);
    mutate(root, "settings.json", s => {
      s.subagents.modelScope.agents[role].allow = ["openai/gpt-6.1-sol"];
    });
    const result = verify(root);
    assert.equal(result.code, 1);
    assert.match(result.output, /pstack delegated model scope mismatch/);
  });
}
test("SoL-Pi manifest version pin cannot drift", t => {
  const root = fixture(t), file = path.join(root, "Dockerfile");
  const docker = readFileSync(file, "utf8");
  assert.ok(docker.includes("ARG SOL_PI_VERSION=0.1.1"));
  writeFileSync(file, docker.replace("ARG SOL_PI_VERSION=0.1.1", "ARG SOL_PI_VERSION=0.1.0"));
  const result = verify(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /SoL-Pi manifest version or official Git ref drift/);
});
test("SoL-Pi must not install a moving Git branch", t => {
  const root = fixture(t), file = path.join(root, "Dockerfile");
  const docker = readFileSync(file, "utf8");
  const changed = docker.replace("git:github.com/NVlabs/SoL-Pi@${SOL_PI_REF}", "git:github.com/NVlabs/SoL-Pi@main");
  assert.notEqual(changed, docker);
  writeFileSync(file, changed);
  const result = verify(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /SoL-Pi official Git install or version assertion mismatch/);
});
test("SoL-Pi build must check the installed package version", t => {
  const root = fixture(t), file = path.join(root, "Dockerfile");
  const docker = readFileSync(file, "utf8");
  const changed = docker.replace(/ && test "\$\(node -p '[^\n]+/, "");
  assert.notEqual(changed, docker);
  writeFileSync(file, changed);
  const result = verify(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /SoL-Pi official Git install or version assertion mismatch/);
});
test("Codemode must retain native tools", t => {
  const root = fixture(t);
  mutate(root, "settings.json", s => { s.codemode.mode = "only"; });
  const result = verify(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /Pi 1.3 settings schema or additive Codemode mismatch/);
});
test("subagent tool declarations stay cache-stable", t => {
  const root = fixture(t);
  mutate(root, "subagent-config.json", c => { c.pinToolDeclarations = false; });
  const result = verify(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /Subagent activation, cache stability, or session bounds mismatch/);
});
test("asynchronous task capacity stays bounded", t => {
  const root = fixture(t);
  mutate(root, "subagent-config.json", c => { c.maxActiveAsyncRunsPerSession = 0; });
  const result = verify(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /Subagent activation, cache stability, or session bounds mismatch/);
});
test("context viewer does not trigger synthetic hooks", t => {
  const root = fixture(t);
  mutate(root, "pi-context-view.json", c => { c.autoProbing = true; });
  const result = verify(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /pi-context-view must not run silent probe/);
});
test("invalid reviewer allowlist fails with clear diagnostic", t => {
  const root = fixture(t);
  mutate(root, "settings.json", s => {
    s.subagents.modelScope.agents.reviewer.allow = { length: 3 };
  });
  const result = verify(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /Native reviewer Claude scope mismatch/);
});
