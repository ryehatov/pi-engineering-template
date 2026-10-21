#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const source = path.resolve(import.meta.dirname, "..");
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "pstack-claude-"));
  cpSync(source, root, {
    recursive: true,
    filter: file => ![".git", "node_modules"].includes(path.relative(source, file).split(path.sep)[0])
  });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function verify(root) {
  const run = spawnSync(process.execPath,
    [path.join(root, "scripts/verify-template.mjs"), root], { encoding: "utf8" });
  assert.equal(run.error, undefined);
  return { status: run.status, output: run.stdout + run.stderr };
}
function editFile(root, file, edit) {
  const name = path.join(root, file);
  const prior = readFileSync(name, "utf8");
  const next = edit(prior);
  assert.notEqual(prior, next, "Mutation must change the fixture");
  writeFileSync(name, next);
}
function editJson(root, file, edit) {
  editFile(root, file, prior => {
    const data = JSON.parse(prior);
    edit(data);
    return JSON.stringify(data, null, 2) + "\n";
  });
}
function rejection(t, mutate, message) {
  const root = fixture(t);
  mutate(root);
  const result = verify(root);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, message);
}

test("valid migrated configuration passes", t => {
  const result = verify(fixture(t));
  assert.equal(result.status, 0, result.output);
});

test("pstack-claude commit pin cannot drift to a branch", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace(
    "PSTACK_CLAUDE_REF=a369e70b8afac1ec3dbad14bc7491d40baf27cce",
    "PSTACK_CLAUDE_REF=main"));
}, /Docker pin mismatch: PSTACK_CLAUDE_REF/));

test("old pi-subagents settings cannot be reintroduced", t => rejection(t, root => {
  editJson(root, "settings.json", s => { s.subagents = { maxSubagentDepth: 2 }; });
}, /Obsolete pi-subagents settings remain/));

test("Codemode must preserve native Pi tools", t => rejection(t, root => {
  editJson(root, "settings.json", s => { s.codemode.mode = "only"; });
}, /Pi Codemode must stay additive/));

test("panel diversity cannot collapse to duplicate model aliases", t => rejection(t, root => {
  editFile(root, "pstack-models.md", s => s.replace(
    "arena runners: opus, fable, sonnet @high, haiku @high",
    "arena runners: opus, fable, fable, haiku @high"));
}, /pstack panel must contain four distinct model aliases/));

test("unavailable or changed alias mappings are detected", t => rejection(t, root => {
  editFile(root, "pstack-models.md", s => s.replace(
    "sonnet=anthropic/claude-opus-5-5", "sonnet=anthropic/does-not-exist"));
}, /pstack Pi aliases must resolve/));

test("Claude panel members must use high effort", t => rejection(t, root => {
  editFile(root, "pstack-models.md", s => s.replace(
    "architect runners: opus, fable, sonnet @high, haiku @high",
    "architect runners: opus, fable, sonnet @xhigh, haiku @high"));
}, /Anthropic review effort must be high/));

test("retired model role names cannot return", t => rejection(t, root => {
  editFile(root, "pstack-models.md", s => s.replace(
    "session hook: on", "how critics: opus\nsession hook: on"));
}, /Unknown pstack sheet key/));

test("pstack sheet remains hooked into the Docker image", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace(
    "COPY --chown=agent:agent pstack-models.md /home/agent/.pi/agent/pstack-models.md",
    "COPY --chown=agent:agent pstack-models.md /tmp/pstack-models.md"));
}, /Docker COPY missing: pstack-models.md/));

test("retired patch script cannot be restored", t => rejection(t, root => {
  writeFileSync(path.join(root, "scripts/patch-pstack.mjs"), "throw new Error('retired');\n");
}, /Retired file remains: scripts\/patch-pstack.mjs/));

test("SoL-Pi pinned revision is not changed without qualification", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace(
    "SOL_PI_REF=219568034fa54ed121ede80961655e33dfb9d0e3",
    "SOL_PI_REF=main"));
}, /Docker pin mismatch: SOL_PI_REF/));
