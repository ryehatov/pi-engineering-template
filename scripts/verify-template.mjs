#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = path.resolve(process.argv[2] || process.cwd());
const errors = [];

function read(relative) {
  try {
    return fs.readFileSync(path.join(root, relative), "utf8");
  } catch (error) {
    errors.push(`${relative}: ${error.message}`);
    return "";
  }
}

function parseJson(relative) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  } catch (error) {
    errors.push(`${relative}: ${error.message}`);
    return null;
  }
}

function requireCondition(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFiles = [
  "Dockerfile",
  "AGENTS.md",
  "settings.json",
  "subagent-config.json",
  "web-search.json",
  "pi-btw.json",
  "skills/development-loop/SKILL.md",
  "skills/development-loop/agents/openai.yaml",
  "skills/engineering-cache/SKILL.md",
  "skills/engineering-cache/agents/openai.yaml",
  "skills/engineering-cache/scripts/cache.mjs",
];

for (const file of requiredFiles) {
  requireCondition(fs.existsSync(path.join(root, file)), `${file}: missing`);
}

const settings = parseJson("settings.json");
const subagents = parseJson("subagent-config.json");
parseJson("web-search.json");
const btw = parseJson("pi-btw.json");

if (settings) {
  requireCondition(settings.defaultProjectTrust === "never", "settings.json: defaultProjectTrust must remain 'never'");

  const scope = settings.subagents?.modelScope;
  requireCondition(scope?.enforce === true && scope?.strict === true, "settings.json: subagent modelScope must be enforced strictly");
  const allow = Array.isArray(scope?.allow) ? scope.allow : [];
  requireCondition(allow.length > 0, "settings.json: subagent modelScope allow list must not be empty");
  requireCondition(new Set(allow).size === allow.length, "settings.json: subagent modelScope allow list contains duplicates");

  const overrides = settings.subagents?.agentOverrides || {};
  for (const role of ["scout", "researcher", "worker", "reviewer", "oracle"]) {
    const override = overrides[role];
    requireCondition(override && override.disabled !== true && typeof override.model === "string" && override.model.length > 0, `settings.json: required role '${role}' must be enabled with a model`);
    if (override?.model) {
      requireCondition(allow.includes(override.model), `settings.json: ${role} model is outside the enforced allow list`);
    }
  }

  for (const [role, override] of Object.entries(overrides)) {
    if (override?.disabled === true || !override?.model) continue;
    requireCondition(allow.includes(override.model), `settings.json: ${role} model is outside the enforced allow list`);
  }

  requireCondition(overrides.worker?.tools === "inherit", "settings.json: worker tools must remain 'inherit'");
  requireCondition(overrides.delegate?.disabled === true, "settings.json: delegate must remain disabled");
  requireCondition(overrides["gpt-pro"]?.disabled === true, "settings.json: gpt-pro must remain disabled");
  if (btw?.model) requireCondition(allow.includes(btw.model), "pi-btw.json: model must be in the enforced subagent allow list");
}

if (subagents) {
  requireCondition(subagents.toolDescriptionMode === "compact", "subagent-config.json: toolDescriptionMode must remain 'compact'");
  requireCondition(subagents.artifactDir === "session", "subagent-config.json: artifactDir must remain 'session'");
  requireCondition(subagents.maxSubagentDepth === 1, "subagent-config.json: maxSubagentDepth must remain 1");
  requireCondition(subagents.missions?.enabled === false, "subagent-config.json: missions must remain disabled");
  requireCondition(subagents.scheduledRuns?.enabled === false, "subagent-config.json: scheduled runs must remain disabled");
  requireCondition(subagents.authorityPolicy?.discardWorktree === "auto", "subagent-config.json: worktree discard must remain automatic");
  requireCondition(subagents.authorityPolicy?.destructiveCleanup === "auto", "subagent-config.json: destructive cleanup must remain automatic");
  requireCondition(subagents.authorityPolicy?.scheduleCreate === "forbid", "subagent-config.json: schedule creation must remain forbidden");
}

const agents = read("AGENTS.md");
requireCondition((agents.match(/^# Global Engineering Instructions$/gm) || []).length === 1, "AGENTS.md: expected exactly one global heading");
requireCondition((agents.match(/The parent owns task decomposition, integration, and the final response\./g) || []).length === 1, "AGENTS.md: parent ownership statement must not be duplicated");
requireCondition((agents.match(/load and follow the\s+`development-loop` skill before the first repository write/g) || []).length === 1, "AGENTS.md: development-loop load gate is missing");
requireCondition(agents.includes("completion and durable-knowledge gates"), "AGENTS.md: development-loop completion gate is missing");
requireCondition(!agents.includes("engineering-cache"), "AGENTS.md: engineering-cache must remain behind development-loop");

const dockerfile = read("Dockerfile");
requireCondition(/^ARG BASE_IMAGE=.*@sha256:[0-9a-f]{64}$/m.test(dockerfile), "Dockerfile: BASE_IMAGE must use a sha256 digest");
for (const match of dockerfile.matchAll(/^ARG ([A-Z0-9_]+_VERSION)=(.+)$/gm)) {
  const [, name, value] = match;
  requireCondition(value.trim() !== "" && value.trim() !== "latest", `Dockerfile: ${name} must use an explicit version`);
}
if (dockerfile.includes("MICROMAMBA_VERSION=")) {
  requireCondition(/^ARG MICROMAMBA_SHA256=[0-9a-f]{64}$/m.test(dockerfile), "Dockerfile: micromamba download must declare a sha256 checksum");
}
requireCondition(dockerfile.includes("COPY --chown=agent:agent skills"), "Dockerfile: global skills directory is not installed");
requireCondition(dockerfile.includes("/home/agent/.pi/agent/skills"), "Dockerfile: global skills destination is missing");
requireCondition(dockerfile.includes('"@earendil-works/pi-coding-agent@${PI_VERSION}"'), "Dockerfile: Pi package installation is missing");

for (const [packageName, versionArg] of [
  ["pi-subagents", "PI_SUBAGENTS_VERSION"],
  ["pi-web-access", "PI_WEB_ACCESS_VERSION"],
  ["pi-lens", "PI_LENS_VERSION"],
  ["@ff-labs/pi-fff", "PI_FFF_VERSION"],
  ["pi-context-view", "PI_CONTEXT_VIEW_VERSION"],
  ["@piex-dev/dap", "DAP_VERSION"],
  ["pi-powerline-footer", "PI_POWERLINE_FOOTER_VERSION"],
  ["pi-rewind-hook", "PI_REWIND_HOOK_VERSION"],
  ["@plannotator/pi-extension", "PLANNOTATOR_VERSION"],
  ["@narumitw/pi-btw", "PI_BTW_VERSION"],
]) {
  const versionRef = "${" + versionArg + "}";
  requireCondition(dockerfile.includes(`ARG ${versionArg}=`), `Dockerfile: ${packageName} version argument is missing`);
  requireCondition(dockerfile.includes(`pi install "npm:${packageName}@${versionRef}"`), `Dockerfile: required extension ${packageName} is not installed`);
}

requireCondition(
  !dockerfile.includes("@narumitw/pi-statusline") && !dockerfile.includes("PI_STATUSLINE_VERSION"),
  "Dockerfile: legacy pi-statusline configuration must not remain",
);

function validateSkill(relative, name) {
  const skill = read(relative);
  requireCondition(new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---\\n`, "s").test(skill), `${relative}: invalid frontmatter`);
  return skill;
}

function validateAgentMetadata(relative) {
  const metadata = read(relative);
  requireCondition(/^interface:\s*$/m.test(metadata), `${relative}: interface mapping is missing`);
  requireCondition(/^\s+display_name:\s*.+$/m.test(metadata), `${relative}: display_name is missing`);
  requireCondition(/^\s+short_description:\s*.+$/m.test(metadata), `${relative}: short_description is missing`);
}

function validateNodeSyntax(relative) {
  const file = path.join(root, relative);
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  requireCondition(result.status === 0, `${relative}: JavaScript syntax check failed${result.stderr ? `: ${result.stderr.trim()}` : ""}`);
}

const developmentLoop = validateSkill("skills/development-loop/SKILL.md", "development-loop");
const engineeringCache = validateSkill("skills/engineering-cache/SKILL.md", "engineering-cache");
validateAgentMetadata("skills/development-loop/agents/openai.yaml");
validateAgentMetadata("skills/engineering-cache/agents/openai.yaml");
validateNodeSyntax("skills/engineering-cache/scripts/cache.mjs");

requireCondition(developmentLoop.includes("Do not replace it with a rewritten task prompt"), "development-loop: original user intent policy is missing");
requireCondition(developmentLoop.includes("current repository-owned verification"), "development-loop: completion verification gate is missing");
requireCondition(developmentLoop.includes("`docs/engineering/cache/` exists"), "development-loop: deterministic cache lookup gate is missing");
requireCondition(developmentLoop.includes("Classify whether the task produced durable knowledge"), "development-loop: durable-knowledge classification gate is missing");
requireCondition(developmentLoop.includes("credible alternative"), "development-loop: ADR selection criteria are incomplete");
requireCondition(developmentLoop.includes("do not invent a repository-wide ADR location or format"), "development-loop: ADR destination boundary is missing");
requireCondition(developmentLoop.includes("`engineering-cache`"), "development-loop: cache routing is missing");
requireCondition(engineeringCache.includes("belong to `development-loop`"), "engineering-cache: lifecycle ownership boundary is missing");

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}
console.log("template verification: ok");
