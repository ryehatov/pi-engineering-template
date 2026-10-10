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
test("invalid reviewer allowlist fails with clear diagnostic", t => {
  const root = fixture(t);
  mutate(root, "settings.json", s => {
    s.subagents.modelScope.agents.reviewer.allow = { length: 3 };
  });
  const result = verify(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /Native reviewer Claude scope mismatch/);
});
