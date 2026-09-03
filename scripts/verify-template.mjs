#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

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
  "README.md",
  "settings.json",
  "subagent-config.json",
  "pstack-models.json",
  "web-search.json",
  "pi-btw.json",
  "pi-fff.json",
  "docs/pi-spec.md",
  "docs/pi-design.md"
];
for (const file of requiredFiles) {
  requireCondition(fs.existsSync(path.join(root, file)), `${file}: missing`);
}

for (const obsolete of [
  "skills/development-loop/SKILL.md",
  "skills/engineering-cache/SKILL.md",
  "scripts/test-engineering-cache.mjs"
]) {
  requireCondition(!fs.existsSync(path.join(root, obsolete)), `${obsolete}: obsolete lifecycle artifact must be removed`);
}

const settings = parseJson("settings.json");
const subagents = parseJson("subagent-config.json");
const pstack = parseJson("pstack-models.json");
const fff = parseJson("pi-fff.json");
parseJson("web-search.json");
parseJson("pi-btw.json");

if (settings) {
  requireCondition(settings.defaultProjectTrust === "never", "settings.json: defaultProjectTrust must remain 'never'");
  const scope = settings.subagents?.modelScope;
  requireCondition(scope?.enforce === true && scope?.strict === true, "settings.json: modelScope must be strictly enforced");
  const allow = Array.isArray(scope?.allow) ? scope.allow : [];
  requireCondition(allow.includes("inherit"), "settings.json: modelScope must allow parent-model inheritance");
  requireCondition(new Set(allow).size === allow.length, "settings.json: modelScope allow list contains duplicates");

  const overrides = settings.subagents?.agentOverrides || {};
  requireCondition(overrides.worker?.model === undefined, "settings.json: worker must not pin a model; pstack inherit-parent must remain effective");
  requireCondition(overrides.worker?.tools === "inherit", "settings.json: worker tools must inherit ambient engineering capabilities");
  requireCondition(overrides["poteto-agent"]?.tools === "inherit", "settings.json: poteto-agent must inherit ambient engineering capabilities");
  requireCondition(overrides["poteto-agent"]?.allowNestedSubagents === true, "settings.json: poteto-agent must allow pstack nested workflow fan-out");

  const lensReadTools = ["lens_diagnostics", "lsp_diagnostics", "module_report", "read_symbol", "read_enclosing", "symbol_search"];
  for (const role of ["scout", "reviewer", "oracle"]) {
    const tools = overrides[role]?.tools;
    requireCondition(Array.isArray(tools), `settings.json: ${role} tools must use an explicit allow list`);
    for (const tool of lensReadTools) {
      requireCondition(tools?.includes(tool), `settings.json: ${role} must expose Lens tool '${tool}'`);
    }
    requireCondition(tools?.includes("grep") && tools?.includes("find"), `settings.json: ${role} must expose stable grep/find names`);
  }
  for (const role of ["reviewer", "oracle"]) {
    for (const tool of ["edit", "write", "ast_grep_replace", "lens_diagnostic_mark", "debug"]) {
      requireCondition(!overrides[role]?.tools?.includes(tool), `settings.json: ${role} must remain read-only; found '${tool}'`);
    }
  }
  for (const [role, override] of Object.entries(overrides)) {
    if (override?.disabled === true || !override?.model) continue;
    requireCondition(allow.includes(override.model), `settings.json: ${role} model is outside modelScope`);
  }
}

if (subagents) {
  requireCondition(subagents.toolDescriptionMode === "compact", "subagent-config.json: compact tool descriptions required");
  requireCondition(subagents.artifactDir === "session", "subagent-config.json: artifactDir must be session");
  requireCondition(subagents.defaultSubagentContext === "fresh", "subagent-config.json: default delegated context must be fresh");
  requireCondition(subagents.maxSubagentDepth === 2, "subagent-config.json: maxSubagentDepth must be 2 for Poteto nested fan-out");
  requireCondition(Number.isInteger(subagents.maxSubagentSpawnsPerRun) && subagents.maxSubagentSpawnsPerRun > 0, "subagent-config.json: explicit positive per-run spawn budget required");
  requireCondition(Number.isInteger(subagents.globalConcurrencyLimit) && subagents.globalConcurrencyLimit > 0, "subagent-config.json: explicit positive global concurrency limit required");
  requireCondition(subagents.parallel?.concurrency <= subagents.globalConcurrencyLimit, "subagent-config.json: parallel concurrency must not exceed global concurrency");
  requireCondition(subagents.missions?.enabled === false, "subagent-config.json: missions must remain disabled");
  requireCondition(subagents.scheduledRuns?.enabled === false, "subagent-config.json: scheduled runs must remain disabled");
  requireCondition(subagents.authorityPolicy?.scheduleCreate === "forbid", "subagent-config.json: schedule creation must remain forbidden");
}

if (pstack) {
  requireCondition(pstack.version === 1, "pstack-models.json: unsupported version");
  requireCondition(pstack.skillsEnabled === true, "pstack-models.json: pstack skills must be enabled");
  const roles = pstack.roles || {};
  for (const role of ["feature, refactoring", "bug-fix", "hardest tasks", "how explorer", "how explainer", "swarm workers", "architect runners", "interrogate reviewers"]) {
    requireCondition(roles[role] !== undefined, `pstack-models.json: missing role '${role}'`);
  }
  const selectors = Object.values(roles).flatMap((value) => Array.isArray(value) ? value : [value]);
  const allow = settings?.subagents?.modelScope?.allow || [];
  for (const selector of selectors) {
    if (selector === "inherit-parent" || selector === "auto") continue;
    requireCondition(allow.includes(selector), `pstack-models.json: model '${selector}' is outside enforced modelScope`);
  }
}

if (fff) {
  requireCondition(fff.mode === "override", "pi-fff.json: mode must remain override");
}

const dockerfile = read("Dockerfile");
requireCondition(/^ARG BASE_IMAGE=.*@sha256:[0-9a-f]{64}$/m.test(dockerfile), "Dockerfile: base image must use a SHA-256 digest");
for (const match of dockerfile.matchAll(/^ARG ([A-Z0-9_]+_VERSION)=(.+)$/gm)) {
  const [, name, value] = match;
  requireCondition(value.trim() !== "" && value.trim() !== "latest", `Dockerfile: ${name} must use an explicit version`);
}
requireCondition(dockerfile.includes("ARG PI_PSTACK_VERSION=0.4.0"), "Dockerfile: pi-pstack 0.4.0 pin missing");
requireCondition(dockerfile.includes('pi install "npm:@zenspc/pi-pstack@${PI_PSTACK_VERSION}"'), "Dockerfile: pi-pstack installation missing");
requireCondition(dockerfile.includes("ARG BUN_VERSION="), "Dockerfile: Bun pin missing");
requireCondition(dockerfile.includes('npm install -g "bun@${BUN_VERSION}"'), "Dockerfile: Bun installation missing");
requireCondition(dockerfile.includes("COPY --chown=agent:agent pstack-models.json"), "Dockerfile: pstack model config copy missing");
requireCondition(dockerfile.includes("ENV PI_SUBAGENT_TASK_DELIVERY=file"), "Dockerfile: file-backed subagent task delivery required");
requireCondition(dockerfile.includes("ENV PLANNOTATOR_REMOTE=1"), "Dockerfile: Plannotator remote mode required");
requireCondition(dockerfile.includes("ENV PLANNOTATOR_BROWSER=xdg-open"), "Dockerfile: Plannotator browser bridge required");

const agents = read("AGENTS.md");
requireCondition(agents.includes("pstack's Poteto Mode"), "AGENTS.md: Poteto policy missing");
requireCondition(!agents.includes("development-loop"), "AGENTS.md: obsolete development-loop policy remains");
requireCondition(!agents.includes("engineering-cache"), "AGENTS.md: obsolete engineering-cache policy remains");

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}
console.log("template verification: ok");
