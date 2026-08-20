#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const errors = [];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function parseJson(relative) {
  try {
    return JSON.parse(read(relative));
  } catch (error) {
    errors.push(`${relative}: ${error.message}`);
    return null;
  }
}

function requireCondition(condition, message) {
  if (!condition) errors.push(message);
}

for (const file of [
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
]) {
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
  requireCondition(new Set(allow).size === allow.length, "settings.json: subagent modelScope allow list contains duplicates");
  for (const [role, override] of Object.entries(settings.subagents?.agentOverrides || {})) {
    if (override?.disabled === true || !override?.model) continue;
    requireCondition(allow.includes(override.model), `settings.json: ${role} model is outside the enforced allow list`);
  }
  requireCondition(settings.subagents?.agentOverrides?.worker?.tools === "inherit", "settings.json: worker tools must remain 'inherit'");
  requireCondition(settings.subagents?.agentOverrides?.delegate?.disabled === true, "settings.json: delegate must remain disabled");
  requireCondition(settings.subagents?.agentOverrides?.["gpt-pro"]?.disabled === true, "settings.json: gpt-pro must remain disabled");
  if (btw?.model) requireCondition(allow.includes(btw.model), "pi-btw.json: model must be in the enforced subagent allow list");
}

if (subagents) {
  requireCondition(subagents.maxSubagentDepth === 1, "subagent-config.json: maxSubagentDepth must remain 1");
  requireCondition(subagents.missions?.enabled === false, "subagent-config.json: missions must remain disabled");
  requireCondition(subagents.scheduledRuns?.enabled === false, "subagent-config.json: scheduled runs must remain disabled");
  requireCondition(subagents.authorityPolicy?.scheduleCreate === "forbid", "subagent-config.json: schedule creation must remain forbidden");
}

const agents = read("AGENTS.md");
requireCondition((agents.match(/^# Global Engineering Instructions$/gm) || []).length === 1, "AGENTS.md: expected exactly one global heading");
requireCondition((agents.match(/The parent owns task decomposition, integration, and the final response\./g) || []).length === 1, "AGENTS.md: parent ownership statement must not be duplicated");
requireCondition((agents.match(/use the `development-loop` skill/g) || []).length === 1, "AGENTS.md: expected exactly one development-loop pointer");
requireCondition(!agents.includes("engineering-cache"), "AGENTS.md: engineering-cache must remain behind development-loop");

const dockerfile = read("Dockerfile");
requireCondition(/^ARG BASE_IMAGE=.*@sha256:[0-9a-f]{64}$/m.test(dockerfile), "Dockerfile: BASE_IMAGE must be pinned by sha256 digest");
for (const match of dockerfile.matchAll(/^ARG ([A-Z0-9_]+_VERSION)=(.+)$/gm)) {
  const [, name, value] = match;
  requireCondition(value.trim() !== "" && value.trim() !== "latest", `Dockerfile: ${name} must be pinned to an exact version`);
}
if (dockerfile.includes("MICROMAMBA_VERSION=")) {
  requireCondition(/^ARG MICROMAMBA_SHA256=[0-9a-f]{64}$/m.test(dockerfile), "Dockerfile: micromamba must be pinned by sha256");
}
requireCondition(dockerfile.includes("COPY --chown=agent:agent skills"), "Dockerfile: global skills directory is not installed");
requireCondition(dockerfile.includes("/home/agent/.pi/agent/skills"), "Dockerfile: global skills destination is missing");

function validateSkill(relative, name) {
  const skill = read(relative);
  requireCondition(new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---\\n`, "s").test(skill), `${relative}: invalid frontmatter`);
  return skill;
}

const developmentLoop = validateSkill("skills/development-loop/SKILL.md", "development-loop");
const engineeringCache = validateSkill("skills/engineering-cache/SKILL.md", "engineering-cache");
requireCondition(developmentLoop.includes("Do not replace it with a rewritten task prompt"), "development-loop: original user intent policy is missing");
requireCondition(developmentLoop.includes("current repository-owned verification"), "development-loop: completion verification gate is missing");
requireCondition(developmentLoop.includes("`engineering-cache`"), "development-loop: cache routing is missing");
requireCondition(engineeringCache.includes("belong to `development-loop`"), "engineering-cache: lifecycle ownership boundary is missing");

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}
console.log("template verification: ok");
