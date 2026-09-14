#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(fs.readFileSync(path.join(repoRoot, "runtime-state.json"), "utf8"));
const [command, sandbox, archiveArg] = process.argv.slice(2);

function usage() {
  console.error("usage: node scripts/runtime-state.mjs <backup|restore> <sandbox> <archive.tgz>");
  process.exit(2);
}

if (!["backup", "restore"].includes(command) || !sandbox || !archiveArg) usage();

if (
  policy.version !== 1 ||
  policy.agentDir !== "/home/agent/.pi/agent" ||
  !Array.isArray(policy.entries) ||
  policy.entries.length === 0
) throw new Error("invalid runtime-state.json");

for (const entry of policy.entries) {
  if (
    typeof entry !== "string" ||
    entry.length === 0 ||
    path.isAbsolute(entry) ||
    entry.split("/").includes("..")
  ) throw new Error(`unsafe runtime-state entry: ${entry}`);
}

const archive = path.resolve(archiveArg);
const tmpArchive = `/tmp/pi-runtime-state-${crypto.randomUUID()}.tgz`;

function run(program, args, capture = false) {
  const result = spawnSync(program, args, {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = capture ? result.stderr?.trim() : "";
    throw new Error(`${program} exited with ${result.status}${stderr ? `: ${stderr}` : ""}`);
  }
  return capture ? result.stdout : "";
}

function runBestEffort(program, args) {
  spawnSync(program, args, { stdio: "ignore" });
}

function validateArchive() {
  const listing = run("tar", ["-tzf", archive], true);
  for (const raw of listing.split("\n")) {
    const entry = raw.replace(/\/$/, "");
    if (!entry) continue;
    if (entry.startsWith("/")) throw new Error(`absolute archive entry rejected: ${entry}`);
    const components = entry.split("/");
    if (components.includes("..")) throw new Error(`parent traversal rejected: ${entry}`);
    if (!policy.entries.includes(components[0])) {
      throw new Error(`archive contains non-persistent state: ${entry}`);
    }
  }
}

function backup() {
  if (fs.existsSync(archive)) throw new Error(`refusing to overwrite: ${archive}`);
  const parent = path.dirname(archive);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });

  const script = `
set -euo pipefail
agent_dir="$1"
tmp_archive="$2"
shift 2
cd "$agent_dir"
entries=()
for entry in "$@"; do
  if [ -e "$entry" ]; then
    entries+=("$entry")
  fi
done
if [ "\${#entries[@]}" -eq 0 ]; then
  echo "no portable Pi runtime state exists yet" >&2
  exit 3
fi
umask 077
tar -czf "$tmp_archive" "\${entries[@]}"
`;

  let staged = false;
  try {
    run("sbx", [
      "exec", sandbox, "bash", "-lc", script, "runtime-state",
      policy.agentDir, tmpArchive, ...policy.entries,
    ]);
    staged = true;
    run("sbx", ["cp", `${sandbox}:${tmpArchive}`, archive]);
    fs.chmodSync(archive, 0o600);
  } finally {
    if (staged) runBestEffort("sbx", ["exec", sandbox, "rm", "-f", tmpArchive]);
  }
  console.log(`runtime state backed up to ${archive}`);
}

function restore() {
  if (!fs.existsSync(archive)) throw new Error(`archive does not exist: ${archive}`);
  validateArchive();
  run("sbx", ["cp", archive, `${sandbox}:${tmpArchive}`]);

  const script = `
set -euo pipefail
agent_dir="$1"
tmp_archive="$2"
shift 2
for entry in "$@"; do
  if [ -e "$agent_dir/$entry" ]; then
    echo "refusing to merge with existing runtime state: $entry" >&2
    exit 4
  fi
done
cd "$agent_dir"
tar -xzf "$tmp_archive"
for file in auth.json pi-accounts.json trust.json; do
  if [ -f "$file" ]; then
    chmod 600 "$file"
  fi
done
`;

  try {
    run("sbx", [
      "exec", sandbox, "bash", "-lc", script, "runtime-state",
      policy.agentDir, tmpArchive, ...policy.entries,
    ]);
  } finally {
    runBestEffort("sbx", ["exec", sandbox, "rm", "-f", tmpArchive]);
  }
  console.log(`runtime state restored from ${archive}`);
}

if (command === "backup") backup();
else restore();
