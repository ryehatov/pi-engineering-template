#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CACHE_DIR = path.join("docs", "engineering", "cache");
const VALID_KINDS = new Set(["finding", "failure", "constraint", "invariant", "assumption", "counterexample"]);
const VALID_STATUS = new Set(["active", "superseded"]);

function fail(message, code = 1) {
  console.error(`error: ${message}`);
  process.exit(code);
}

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.error) fail(`cannot execute git: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    fail((result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim());
  }
  return result;
}

function repoRoot() {
  const result = git(["rev-parse", "--show-toplevel"]);
  return result.stdout.trim();
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
  if (!Array.isArray(metadata.watch) || metadata.watch.length === 0) errors.push("watch must contain at least one file or directory");
  if (!Array.isArray(metadata.evidence) || metadata.evidence.length === 0) errors.push("evidence must contain at least one item");
  for (const watch of Array.isArray(metadata.watch) ? metadata.watch : []) {
    if (/[?*\[]/.test(watch)) errors.push(`watch path must not use globs: ${watch}`);
    if (path.isAbsolute(watch) || watch.split(/[\\/]/).includes("..")) errors.push(`watch path must stay inside the repository: ${watch}`);
  }
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

function checkNote(root, file) {
  const errors = validateNote(file);
  const rel = path.relative(root, file);
  if (errors.length) {
    return { file: rel, state: "unknown", reasons: errors };
  }

  const { metadata } = parseFrontmatter(file);
  const commit = metadata.verified_at;
  const watch = metadata.watch;
  const object = git(["cat-file", "-e", `${commit}^{commit}`], { allowFailure: true });
  if (object.status !== 0) return { file: rel, state: "unknown", reasons: [`verified_at is unavailable: ${commit}`] };

  const ancestor = git(["merge-base", "--is-ancestor", commit, "HEAD"], { allowFailure: true });
  if (ancestor.status !== 0) return { file: rel, state: "unknown", reasons: [`verified_at is not an ancestor of HEAD: ${commit}`] };

  const committed = git(["diff", "--quiet", `${commit}..HEAD`, "--", ...watch], { allowFailure: true });
  const working = git(["status", "--porcelain=v1", "--", ...watch]);
  const reasons = [];
  if (committed.status !== 0) reasons.push("declared watch paths changed after verified_at");
  if (working.stdout.trim()) reasons.push("declared watch paths have uncommitted changes");

  return reasons.length
    ? { file: rel, state: "stale-candidate", reasons }
    : { file: rel, state: "fresh-candidate", reasons: ["no declared invalidating repository change detected"] };
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
    if (result.state === "unknown") exitCode = 1;
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
  if (watch.length === 0) fail("provide at least one stable file or directory as a watch path");
  for (const item of watch) {
    if (/[?*\[]/.test(item)) fail(`watch path must not use globs: ${item}`);
    if (path.isAbsolute(item) || item.split(/[\\/]/).includes("..")) fail(`watch path must stay inside the repository: ${item}`);
  }

  const dir = path.join(root, CACHE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug}.md`);
  if (fs.existsSync(file)) fail(`cache note already exists: ${path.relative(root, file)}`);
  const commit = git(["rev-parse", "HEAD"]).stdout.trim();
  const evidence = watch[0];
  const note = `---\nid: K-${slug}\nkind: finding\nstatus: active\nverified_at: ${commit}\nwatch:\n${watch.map((item) => `  - ${item}`).join("\n")}\nevidence:\n  - ${evidence}\n---\n\n# ${slug.replace(/-/g, " ")}\n\n## Finding\n\n<non-obvious conclusion>\n\n## Evidence\n\n- \`${evidence}\`\n\n## Do not retry\n\n<omit this section if there is no costly failed approach>\n\n## Revalidate when\n\n<semantic invalidation conditions not fully captured by watch paths>\n`;
  fs.writeFileSync(file, note);
  console.log(path.relative(root, file));
}

const [command, ...args] = process.argv.slice(2);
if (!command || !["new", "lint", "check"].includes(command)) {
  fail("usage: cache.mjs <new|lint|check> [...]", 1);
}
const root = repoRoot();
process.chdir(root);
if (command === "new") cmdNew(root, args);
if (command === "lint") cmdLint(root);
if (command === "check") cmdCheck(root, args);
