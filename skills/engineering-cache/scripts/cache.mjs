#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CACHE_DIR = path.join("docs", "engineering", "cache");
const VALID_KINDS = new Set(["finding", "failure", "constraint", "invariant", "assumption", "counterexample"]);
const VALID_STATUS = new Set(["active", "superseded"]);

function fail(message, code = 1) {
  console.error(`error: ${message}`);
  process.exit(code);
}

function git(args, { allowFailure = false, env = process.env } = {}) {
  const result = spawnSync("git", args, { encoding: "utf8", env });
  if (result.error) fail(`cannot execute git: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    fail((result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim());
  }
  return result;
}

function repoRoot() {
  return git(["rev-parse", "--show-toplevel"]).stdout.trim();
}

function parseFrontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") throw new Error("missing YAML frontmatter opener");
  const end = lines.indexOf("---", 1);
  if (end < 0) throw new Error("missing YAML frontmatter closer");

  const metadata = {};
  let listKey = null;
  for (const raw of lines.slice(1, end)) {
    if (/^\s+-\s+/.test(raw)) {
      if (!listKey) throw new Error(`list item without key: ${raw.trim()}`);
      metadata[listKey].push(raw.replace(/^\s+-\s+/, "").trim());
      continue;
    }
    const match = raw.match(/^([a-z_]+):(?:\s*(.*))?$/);
    if (!match) throw new Error(`unsupported frontmatter line: ${raw}`);
    const [, key, value = ""] = match;
    if (value === "") {
      metadata[key] = [];
      listKey = key;
    } else {
      metadata[key] = value.trim();
      listKey = null;
    }
  }
  return { metadata, body: lines.slice(end + 1).join("\n") };
}

function validateWatch(watch, errors) {
  if (!Array.isArray(watch) || watch.length === 0) {
    errors.push("watch must contain at least one file or directory");
    return;
  }
  if (new Set(watch).size !== watch.length) errors.push("watch must not contain duplicate paths");
  for (const item of watch) {
    if (/[?*\[]/.test(item)) errors.push(`watch path must not use globs: ${item}`);
    if (path.isAbsolute(item) || item.split(/[\\/]/).includes("..")) errors.push(`watch path must stay inside the repository: ${item}`);
  }
}

function validateNote(file) {
  const errors = [];
  let parsed;
  try {
    parsed = parseFrontmatter(file);
  } catch (error) {
    return [error.message];
  }
  const { metadata, body } = parsed;
  for (const key of ["id", "kind", "status", "verified_at", "watch", "evidence"]) {
    if (!(key in metadata)) errors.push(`missing ${key}`);
  }
  if (metadata.id && !/^K-[a-z0-9][a-z0-9-]*$/.test(metadata.id)) errors.push("id must match K-<lowercase-slug>");
  if (metadata.kind && !VALID_KINDS.has(metadata.kind)) errors.push(`unsupported kind: ${metadata.kind}`);
  if (metadata.status && !VALID_STATUS.has(metadata.status)) errors.push(`unsupported status: ${metadata.status}`);
  if (metadata.verified_at && !/^[0-9a-f]{7,40}$/i.test(metadata.verified_at)) errors.push("verified_at must be a Git object id");
  if (metadata.watch_fingerprint && !/^sha256:[0-9a-f]{64}$/.test(metadata.watch_fingerprint)) errors.push("watch_fingerprint must be sha256:<64 lowercase hex>");
  validateWatch(metadata.watch, errors);
  if (!Array.isArray(metadata.evidence) || metadata.evidence.length === 0) errors.push("evidence must contain at least one item");
  if (metadata.status === "superseded" && !metadata.superseded_by) errors.push("superseded notes must declare superseded_by");
  if (metadata.status !== "superseded" && metadata.superseded_by) errors.push("superseded_by is valid only when status is superseded");
  for (const heading of ["# ", "## Finding", "## Evidence", "## Revalidate when"]) {
    if (!body.includes(heading)) errors.push(`missing body section: ${heading.trim()}`);
  }
  return errors;
}

function listNotes(root) {
  const dir = path.join(root, CACHE_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function resolveNote(root, input) {
  const candidate = path.resolve(root, input);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) fail(`note is outside repository: ${input}`);
  if (!fs.existsSync(candidate)) fail(`note does not exist: ${input}`);
  return candidate;
}

function prospectiveWatchFingerprint(root, watch) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "engineering-cache-"));
  const index = path.join(tmp, "index");
  const env = { ...process.env, GIT_INDEX_FILE: index };
  try {
    git(["read-tree", "HEAD"], { env });
    const materialized = watch.filter((item) =>
      fs.existsSync(path.join(root, item)) || git(["ls-files", "--", item], { env }).stdout.trim(),
    );
    if (materialized.length) git(["add", "-A", "--", ...materialized], { env });
    const listing = git(["ls-files", "-s", "--", ...watch], { env }).stdout;
    return `sha256:${crypto.createHash("sha256").update(listing).digest("hex")}`;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function committedWatchFingerprint(watch) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "engineering-cache-"));
  const index = path.join(tmp, "index");
  const env = { ...process.env, GIT_INDEX_FILE: index };
  try {
    git(["read-tree", "HEAD"], { env });
    const listing = git(["ls-files", "-s", "--", ...watch], { env }).stdout;
    return `sha256:${crypto.createHash("sha256").update(listing).digest("hex")}`;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function checkLegacyNote(metadata) {
  const commit = metadata.verified_at;
  const watch = metadata.watch;
  const object = git(["cat-file", "-e", `${commit}^{commit}`], { allowFailure: true });
  if (object.status !== 0) return { state: "unknown", reasons: [`verified_at is unavailable and note has no watch_fingerprint: ${commit}`] };
  const ancestor = git(["merge-base", "--is-ancestor", commit, "HEAD"], { allowFailure: true });
  if (ancestor.status !== 0) return { state: "unknown", reasons: [`verified_at is not an ancestor of HEAD and note has no watch_fingerprint: ${commit}`] };
  const committed = git(["diff", "--quiet", `${commit}..HEAD`, "--", ...watch], { allowFailure: true });
  return committed.status === 0
    ? { state: "fresh-candidate", reasons: ["legacy note: no declared invalidating repository change detected"] }
    : { state: "stale-candidate", reasons: ["legacy note: declared watch paths changed after verified_at"] };
}

function checkNote(root, file) {
  const errors = validateNote(file);
  const rel = path.relative(root, file);
  if (errors.length) return { file: rel, state: "unknown", reasons: errors };

  const { metadata } = parseFrontmatter(file);
  if (metadata.status === "superseded") {
    return { file: rel, state: "superseded", reasons: [`superseded by ${metadata.superseded_by}`] };
  }

  const watch = metadata.watch;
  const working = git(["status", "--porcelain=v1", "--untracked-files=all", "--", ...watch]);
  if (working.stdout.trim()) {
    return { file: rel, state: "stale-candidate", reasons: ["declared watch paths have uncommitted changes"] };
  }

  if (!metadata.watch_fingerprint) {
    const result = checkLegacyNote(metadata);
    return { file: rel, ...result };
  }

  const current = committedWatchFingerprint(watch);
  return current === metadata.watch_fingerprint
    ? { file: rel, state: "fresh-candidate", reasons: ["declared watch surface matches the verified fingerprint"] }
    : { file: rel, state: "stale-candidate", reasons: ["declared watch surface differs from the verified fingerprint"] };
}

function cmdLint(root) {
  const notes = listNotes(root);
  let invalid = 0;
  for (const file of notes) {
    const errors = validateNote(file);
    const rel = path.relative(root, file);
    if (errors.length) {
      invalid += 1;
      console.log(`${rel}: invalid`);
      for (const error of errors) console.log(`  - ${error}`);
    } else {
      console.log(`${rel}: valid`);
    }
  }
  if (notes.length === 0) console.log(`${CACHE_DIR}: no cache notes`);
  process.exit(invalid ? 1 : 0);
}

function cmdCheck(root, args) {
  const files = args.length ? args.map((item) => resolveNote(root, item)) : listNotes(root);
  if (files.length === 0) {
    console.log(`${CACHE_DIR}: no cache notes`);
    return;
  }
  let exitCode = 0;
  for (const file of files) {
    const result = checkNote(root, file);
    console.log(`${result.file}: ${result.state}`);
    for (const reason of result.reasons) console.log(`  - ${reason}`);
    if (result.state === "stale-candidate") exitCode = Math.max(exitCode, 2);
    if (result.state === "unknown") exitCode = Math.max(exitCode, 1);
  }
  process.exit(exitCode);
}

function slugify(value) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) fail("slug must contain letters or digits");
  return slug;
}

function cmdNew(root, args) {
  if (args.length === 0) fail("usage: cache.mjs new <slug> [watch-path ...]");
  const slug = slugify(args[0]);
  const watch = args.slice(1);
  const watchErrors = [];
  validateWatch(watch, watchErrors);
  if (watchErrors.length) fail(watchErrors.join("; "));

  const dir = path.join(root, CACHE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug}.md`);
  if (fs.existsSync(file)) fail(`cache note already exists: ${path.relative(root, file)}`);
  const commit = git(["rev-parse", "HEAD"]).stdout.trim();
  const fingerprint = prospectiveWatchFingerprint(root, watch);
  const evidence = watch[0];
  const note = `---\nid: K-${slug}\nkind: finding\nstatus: active\nverified_at: ${commit}\nwatch_fingerprint: ${fingerprint}\nwatch:\n${watch.map((item) => `  - ${item}`).join("\n")}\nevidence:\n  - ${evidence}\n---\n\n# ${slug.replace(/-/g, " ")}\n\n## Finding\n\n<non-obvious conclusion>\n\n## Evidence\n\n- \`${evidence}\`\n\n## Do not retry\n\n<omit this section if there is no costly failed approach>\n\n## Revalidate when\n\n<semantic invalidation conditions not fully captured by watch paths>\n`;
  fs.writeFileSync(file, note);
  console.log(path.relative(root, file));
}

const [command, ...args] = process.argv.slice(2);
if (!command || !["new", "lint", "check"].includes(command)) fail("usage: cache.mjs <new|lint|check> [...]", 1);
const root = repoRoot();
process.chdir(root);
if (command === "new") cmdNew(root, args);
if (command === "lint") cmdLint(root);
if (command === "check") cmdCheck(root, args);
