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

test("Pi 1.4.0 host version cannot regress", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace("ARG PI_VERSION=1.4.0", "ARG PI_VERSION=1.3.0"));
}, /Docker pin mismatch: PI_VERSION/));

test("pstack-claude commit pin cannot drift to a branch", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace(
    "PSTACK_CLAUDE_REF=903e7385382389806c59d6989b6274e24165082b",
    "PSTACK_CLAUDE_REF=main"));
}, /Docker pin mismatch: PSTACK_CLAUDE_REF/));

test("Claude CLI pin must remain immutable", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace("ARG CLAUDE_CODE_VERSION=2.1.308", "ARG CLAUDE_CODE_VERSION=latest"));
}, /Docker pin mismatch: CLAUDE_CODE_VERSION/));

test("Claude CLI must be installed", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace('npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"', "true"));
}, /Claude Code CLI install\/verification/));

test("Claude CLI executable must be checked at build time", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace("&& claude --version", "&& true"));
}, /Claude Code CLI install\/verification/));

test("Claude CLI lifecycle scripts must remain enabled", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace('npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"',
    'npm install -g --ignore-scripts "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"'));
}, /Claude Code CLI install\/verification/));

test("Claude CLI provider pin cannot drift", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace("PI_CLAUDE_CODE_REF=70abb65186592ca788b29b3db22c3160d629c41f", "PI_CLAUDE_CODE_REF=main"));
}, /Docker pin mismatch: PI_CLAUDE_CODE_REF/));

test("Claude CLI provider entrypoint must be installed", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace("test -f /home/agent/.pi/agent/git/github.com/earendil-works/pi-claude-code/src/index.ts", "test -f /tmp/absent.ts"));
}, /Docker Git install or package entrypoint check missing/));

test("Node engine check for provider bridge must remain", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace("pi-claude-code requires Node >=22.19.0", "Node too old accepted"));
}, /pi-claude-code Node >=22[.]19[.]0 preflight/));

test("overage consent must not be enabled in Docker", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace("ENV TZ=Asia/Tokyo", "ENV PI_CLAUDE_CODE_ALLOW_USAGE_CREDITS=1\nENV TZ=Asia/Tokyo"));
}, /Claude usage credits must not be automatically enabled/));

test("Claude reviewers cannot return to direct Anthropic OAuth", t => rejection(t, root => {
  editFile(root, "pstack-models.md", s => s.replace("sonnet=claude-code/claude-opus-5-5", "sonnet=anthropic/claude-opus-5-5"));
}, /pstack Pi aliases must resolve/));
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
    "sonnet=claude-code/claude-opus-5-5", "sonnet=claude-code/does-not-exist"));
}, /pstack Pi aliases must resolve/));

test("Claude reviewers are not silently replaced by another provider", t => rejection(t, root => {
  editFile(root, "pstack-models.md", s => s.replace(
    "sonnet=claude-code/claude-opus-5-5", "sonnet=openai/gpt-6-sol"));
}, /pstack Pi aliases must resolve/));

test("Claude panel members must use high effort", t => rejection(t, root => {
  editFile(root, "pstack-models.md", s => s.replace(
    "architect runners: opus, fable, sonnet @high, haiku @high",
    "architect runners: opus, fable, sonnet @xhigh, haiku @high"));
}, /Claude Code reviewer effort must be high/));

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

test("removed Goal settings file cannot be restored", t => rejection(t, root => {
  writeFileSync(path.join(root, "pi-goal.json"), '{"rpc":{"enabled":false}}\n');
}, /Retired file remains: pi-goal[.]json/));

test("Goal package cannot be reinstalled", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace(
    'ARG PI_BTW_VERSION=0.62.0',
    'ARG PI_BTW_VERSION=0.62.0\nRUN pi install "npm:@narumitw/pi-goal@0.54.13"'));
}, /Retired runtime reference: @narumitw[/]pi-goal/));

test("pstack-claude Git commit must not have a redundant version argument", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace(
    "ARG PSTACK_CLAUDE_REF=",
    "ARG PSTACK_CLAUDE_VERSION=0.9.97\nARG PSTACK_CLAUDE_REF="));
}, /Retired runtime reference: PSTACK_CLAUDE_VERSION/));

test("SoL-Pi Git commit must not have a redundant version argument", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace(
    "ARG SOL_PI_REF=",
    "ARG SOL_PI_VERSION=0.1.1\nARG SOL_PI_REF="));
}, /Retired runtime reference: SOL_PI_VERSION/));

test("SoL-Pi must not reintroduce a manifest-version assertion", t => rejection(t, root => {
  editFile(root, "Dockerfile", s => s.replace(
    'pi install "git:github.com/NVlabs/SoL-Pi@${SOL_PI_REF}"',
    'pi install "git:github.com/NVlabs/SoL-Pi@${SOL_PI_REF}" && node -p \`require("/tmp/SoL-Pi/package.json").version\`'));
}, /Retired runtime reference: [/].*SoL-Pi[/]package[.]json/));

test("SoL-Pi configuration schema version remains required", t => rejection(t, root => {
  editJson(root, "sol-pi.json", config => { delete config.version; });
}, /SoL-Pi context optimization mismatch/));

test("installing packages after copying settings invalidates the Docker cache", t => rejection(t, root => {
  editFile(root, "Dockerfile", source => source.replace(
    "COPY --chown=agent:agent settings.json /tmp/pi-template-settings.json",
    "COPY --chown=agent:agent settings.json /home/agent/.pi/agent/settings.json"));
}, /Docker (?:COPY missing|package caching or settings registration order mismatch)/));

test("package installation must precede the runtime preferences", t => rejection(t, root => {
  editFile(root, "Dockerfile", source => source.replace(
    'RUN pi install "npm:@narumitw/pi-accounts',
    'COPY --chown=agent:agent settings.json /tmp/pi-template-settings.json\nRUN pi install "npm:@narumitw/pi-accounts'));
}, /Docker package caching or settings registration order mismatch/));

test("Docker cannot install an unregistered package", t => rejection(t, root => {
  editFile(root, "Dockerfile", source => source.replace(
    'RUN pi install "npm:@narumitw/pi-accounts',
    'RUN pi install "npm:unexpected@1.0.0" && pi install "npm:@narumitw/pi-accounts'));
}, /Docker package set does not match the registered package policy/));

test("the Pi package registry merge command is required", t => rejection(t, root => {
  editFile(root, "Dockerfile", source => source.replace(
    "RUN node /tmp/merge-pi-settings.mjs",
    "RUN true # node /tmp/merge-pi-settings.mjs"));
}, /Docker package caching or settings registration order mismatch/));

test("context files must not suppress the package merge source", t => rejection(t, root => {
  editFile(root, ".dockerignore", source => source + "scripts/merge-pi-settings.mjs\n");
}, /Docker context filtering missing or excludes the merge script/));
