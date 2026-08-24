#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../skills/engineering-cache/scripts/cache.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "engineering-cache-test-"));

function run(command, args = [], { cwd = tmp, allowFailure = false } = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed (${result.status})\n${result.stdout}${result.stderr}`);
  }
  return result;
}

function git(...args) {
  return run("git", args);
}

function cache(...args) {
  return run(process.execPath, [script, ...args], { allowFailure: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectState(note, state, exitCode) {
  const result = cache("check", note);
  assert(result.status === exitCode, `expected exit ${exitCode}, got ${result.status}: ${result.stdout}${result.stderr}`);
  assert(result.stdout.includes(`: ${state}`), `expected ${state}: ${result.stdout}${result.stderr}`);
}

try {
  git("init", "-q");
  git("config", "user.email", "cache-test@example.invalid");
  git("config", "user.name", "Engineering Cache Test");
  fs.mkdirSync(path.join(tmp, "src"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "src", "value.txt"), "v1\n");
  git("add", ".");
  git("commit", "-qm", "initial");

  fs.writeFileSync(path.join(tmp, "src", "value.txt"), "v2\n");
  let result = cache("new", "verified-change", "src/value.txt");
  assert(result.status === 0, result.stderr);
  const note = "docs/engineering/cache/verified-change.md";
  git("add", ".");
  git("commit", "-qm", "verified change and note");
  expectState(note, "fresh-candidate", 0);

  fs.writeFileSync(path.join(tmp, "unrelated.txt"), "x\n");
  git("add", "unrelated.txt");
  git("commit", "-qm", "unrelated");
  expectState(note, "fresh-candidate", 0);

  fs.writeFileSync(path.join(tmp, "src", "value.txt"), "v3\n");
  expectState(note, "stale-candidate", 2);
  git("restore", "src/value.txt");
  expectState(note, "fresh-candidate", 0);

  fs.writeFileSync(path.join(tmp, "src", "value.txt"), "v3\n");
  git("add", "src/value.txt");
  git("commit", "-qm", "watched change");
  expectState(note, "stale-candidate", 2);
  fs.writeFileSync(path.join(tmp, "src", "value.txt"), "v2\n");
  git("add", "src/value.txt");
  git("commit", "-qm", "restore watched state");
  expectState(note, "fresh-candidate", 0);

  const notePath = path.join(tmp, note);
  const saved = fs.readFileSync(notePath, "utf8");
  fs.writeFileSync(notePath, saved.replace(/^verified_at: .+$/m, "verified_at: deadbeef"));
  expectState(note, "fresh-candidate", 0);
  git("restore", note);

  const active = fs.readFileSync(notePath, "utf8");
  fs.writeFileSync(notePath, active.replace("status: active", "status: superseded\nsuperseded_by: K-replacement"));
  expectState(note, "superseded", 0);
  git("restore", note);

  result = cache("new", "sentinel", "future/generated.txt");
  assert(result.status === 0, result.stderr);
  const sentinel = "docs/engineering/cache/sentinel.md";
  git("add", sentinel);
  git("commit", "-qm", "add sentinel note");
  expectState(sentinel, "fresh-candidate", 0);
  fs.mkdirSync(path.join(tmp, "future"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "future", "generated.txt"), "present\n");
  expectState(sentinel, "stale-candidate", 2);
  git("add", "future/generated.txt");
  git("commit", "-qm", "create sentinel path");
  expectState(sentinel, "stale-candidate", 2);

  const head = git("rev-parse", "HEAD").stdout.trim();
  const legacyPath = path.join(tmp, "docs", "engineering", "cache", "legacy.md");
  fs.writeFileSync(legacyPath, `---\nid: K-legacy\nkind: finding\nstatus: active\nverified_at: ${head}\nwatch:\n  - src/value.txt\nevidence:\n  - src/value.txt\n---\n\n# legacy\n\n## Finding\n\nlegacy\n\n## Evidence\n\n- current tree\n\n## Revalidate when\n\nwatched implementation changes\n`);
  git("add", legacyPath);
  git("commit", "-qm", "legacy note");
  expectState("docs/engineering/cache/legacy.md", "fresh-candidate", 0);

  result = cache("new", "duplicate", "src/value.txt", "src/value.txt");
  assert(result.status === 1 && result.stderr.includes("duplicate"), `duplicate watch was not rejected: ${result.stdout}${result.stderr}`);

  result = cache("lint");
  assert(result.status === 0, `lint failed: ${result.stdout}${result.stderr}`);

  console.log("engineering-cache behavior: ok");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
