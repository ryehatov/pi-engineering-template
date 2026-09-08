#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const errors = [];
const filePath = (f) => path.join(root, f);
const exists = (f) => fs.existsSync(filePath(f));
const ok = (value, message) => { if (!value) errors.push(message); };
const seteq = (a, b) => Array.isArray(a) && a.length === b.length && new Set(a).size === a.length && b.every((x) => a.includes(x));
const text = (f) => {
  try { return fs.readFileSync(filePath(f), "utf8"); }
  catch (e) { errors.push(`${f}: ${e.message}`); return ""; }
};
const json = (f) => {
  const source = text(f);
  if (!source) return {};
  try { return JSON.parse(source); }
  catch (e) { errors.push(`${f}: ${e.message}`); return {}; }
};

const thinkingLevels = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
const thinkingRank = new Map(thinkingLevels.map((level, index) => [level, index]));
const selector = (value) => {
  if (typeof value !== "string" || !value) return null;
  const split = value.lastIndexOf(":");
  if (split > 0) {
    const thinking = value.slice(split + 1);
    if (thinkingRank.has(thinking)) return { model: value.slice(0, split), thinking };
  }
  return { model: value, thinking: null };
};

const required = [
  "Dockerfile",
  "README.md",
  "settings.json",
  "models.json",
  "subagent-config.json",
  "pstack-models.json",
  "web-search.json",
  "pi-btw.json",
  "pi-fff.json",
  "docs/pi-spec.md",
  "docs/pi-design.md",
  "docs/model-policy.md",
  "docs/operations.md",
];
for (const f of required) ok(exists(f), `${f}: missing`);
ok(!exists("AGENTS.md"), "AGENTS.md: template-level global agent prompt must remain absent");
for (const f of ["skills/development-loop/SKILL.md", "skills/engineering-cache/SKILL.md", "scripts/test-engineering-cache.mjs"]) {
  ok(!exists(f), `${f}: obsolete`);
}

const settings = json("settings.json");
const models = json("models.json");
const sub = json("subagent-config.json");
const pstack = json("pstack-models.json");
const btw = json("pi-btw.json");
const fff = json("pi-fff.json");

ok(typeof settings.defaultProvider === "string" && settings.defaultProvider.length > 0, "settings.json: defaultProvider missing");
ok(typeof settings.defaultModel === "string" && settings.defaultModel.length > 0, "settings.json: defaultModel missing");
ok(thinkingRank.has(settings.defaultThinkingLevel), "settings.json: invalid defaultThinkingLevel");
ok(settings.defaultProjectTrust === "never", "settings.json: defaultProjectTrust must be never");

const sa = settings.subagents || {};
const scope = sa.modelScope || {};
const allow = Array.isArray(scope.allow) ? scope.allow : [];
ok(scope.enforce === true && scope.strict === true, "settings.json: subagent modelScope must be strict and enforced");
ok(allow.length > 1 && allow.includes("inherit"), "settings.json: modelScope must include inherit and explicit model ids");
ok(new Set(allow).size === allow.length, "settings.json: modelScope contains duplicate entries");
for (const model of allow.filter((x) => x !== "inherit")) {
  ok(typeof model === "string" && model.includes("/") && !model.includes("*"), `settings.json: modelScope entry must be explicit and provider-qualified (${model})`);
}
const allowedModels = new Set(allow.filter((x) => x !== "inherit"));
const qualifyParent = settings.defaultModel?.includes("/") ? settings.defaultModel : `${settings.defaultProvider}/${settings.defaultModel}`;
ok(allowedModels.has(qualifyParent), `settings.json: parent model is outside strict modelScope (${qualifyParent})`);

const providers = models.providers || {};
ok(seteq(Object.keys(providers), ["commandcode-goat"]), "models.json: commandcode-goat must be the only custom provider");
const provider = providers["commandcode-goat"] || {};
ok(provider.baseUrl === "https://api.commandcode.ai/provider/v1", "models.json: Command Code Provider API URL mismatch");
ok(provider.api === "openai-completions", "models.json: Command Code API adapter mismatch");
ok(provider.apiKey === "$COMMAND_CODE_API_KEY" && provider.authHeader === true, "models.json: runtime API-key auth mismatch");
ok(provider.compat?.supportsStore === false, "models.json: provider must not advertise store support");
ok(provider.compat?.supportsReasoningEffort === true, "models.json: provider must advertise reasoning effort support");

const customModels = Array.isArray(provider.models) ? provider.models : [];
ok(customModels.length > 0, "models.json: Command Code model catalog is empty");
ok(new Set(customModels.map((m) => m.id)).size === customModels.length, "models.json: duplicate Command Code model ids");
const customQualified = new Set();
const customThinking = new Map();
for (const model of customModels) {
  const qualified = `commandcode-goat/${model.id}`;
  customQualified.add(qualified);
  ok(allowedModels.has(qualified), `models.json: custom model is outside strict modelScope (${qualified})`);
  ok(model.reasoning === true && Array.isArray(model.input) && model.input.includes("text"), `models.json: invalid capability metadata (${model.id})`);
  ok(Number.isFinite(model.contextWindow) && model.contextWindow > 0 && Number.isFinite(model.maxTokens) && model.maxTokens > 0, `models.json: invalid token limits (${model.id})`);
  const map = model.thinkingLevelMap || {};
  const active = new Set(Object.entries(map).filter(([, value]) => typeof value === "string" && value.length > 0).map(([level]) => level));
  ok(active.size > 0 && [...active].every((level) => thinkingRank.has(level)), `models.json: invalid thinkingLevelMap (${model.id})`);
  customThinking.set(qualified, active);
}
for (const model of allowedModels) {
  if (model.startsWith("commandcode-goat/")) ok(customQualified.has(model), `settings.json: scoped Command Code model missing from models.json (${model})`);
}

const checkModelThinking = (model, thinking, label) => {
  ok(allowedModels.has(model) || model === "inherit", `${label}: model outside strict modelScope (${model})`);
  if (thinking !== undefined && thinking !== null) {
    ok(thinkingRank.has(thinking), `${label}: invalid thinking level (${thinking})`);
    const active = customThinking.get(model);
    if (active) ok(active.has(thinking), `${label}: unsupported Command Code thinking level (${model}:${thinking})`);
  }
};

checkModelThinking(sa.defaultModel, sa.defaultThinking, "settings.json: subagent default");
ok(thinkingRank.has(sa.maxThinking), "settings.json: invalid subagent maxThinking");
if (thinkingRank.has(sa.defaultThinking) && thinkingRank.has(sa.maxThinking)) {
  ok(thinkingRank.get(sa.defaultThinking) <= thinkingRank.get(sa.maxThinking), "settings.json: defaultThinking exceeds maxThinking");
}

const overrides = sa.agentOverrides || {};
for (const [name, config] of Object.entries(overrides)) {
  if (!config || config.disabled === true || !config.model) continue;
  const effectiveThinking = config.thinking ?? sa.defaultThinking;
  checkModelThinking(config.model, effectiveThinking, `settings.json: agentOverrides.${name}`);
  if (thinkingRank.has(effectiveThinking) && thinkingRank.has(sa.maxThinking)) {
    ok(thinkingRank.get(effectiveThinking) <= thinkingRank.get(sa.maxThinking), `settings.json: agentOverrides.${name} exceeds maxThinking`);
  }
}
ok(overrides.worker?.tools === "inherit", "settings.json: worker must inherit ambient engineering tools");
ok(overrides["poteto-agent"]?.tools === "inherit" && overrides["poteto-agent"]?.allowNestedSubagents === true, "settings.json: poteto-agent must inherit tools and allow nested subagents");
ok(overrides.delegate?.disabled === true && overrides["gpt-pro"]?.disabled === true, "settings.json: delegate and gpt-pro must remain disabled");
const mutationTools = ["edit", "write", "ast_grep_replace", "lens_diagnostic_mark", "debug"];
for (const name of ["scout", "reviewer", "oracle"]) {
  const tools = overrides[name]?.tools;
  ok(Array.isArray(tools), `settings.json: ${name} must have an explicit source-read-only tool list`);
  if (Array.isArray(tools)) for (const tool of mutationTools) ok(!tools.includes(tool), `settings.json: ${name} must remain source-read-only (${tool})`);
}

const expectedPstackRoles = [
  "feature, refactoring",
  "bug-fix",
  "perf-issue",
  "hillclimb",
  "judgment and prose",
  "hardest tasks",
  "how explorer",
  "how explainer",
  "how critics",
  "why investigators",
  "why synthesizer",
  "reflect tooling",
  "reflect judgment, divergent, synthesizer",
  "arena runners",
  "arena cross-judge pool",
  "swarm workers",
  "architect runners",
  "interrogate reviewers",
];
ok(pstack.version === 1 && pstack.skillsEnabled === true, "pstack-models.json: unsupported version or skills disabled");
ok(seteq(Object.keys(pstack.roles || {}), expectedPstackRoles), "pstack-models.json: pstack role coverage mismatch");
for (const [role, raw] of Object.entries(pstack.roles || {})) {
  const values = Array.isArray(raw) ? raw : [raw];
  if (Array.isArray(raw)) ok(raw.length >= 2, `pstack-models.json: panel role must have at least two selectors (${role})`);
  for (const rawSelector of values) {
    const parsed = selector(rawSelector);
    ok(parsed?.thinking !== null, `pstack-models.json: selector must include thinking (${rawSelector})`);
    if (parsed) checkModelThinking(parsed.model, parsed.thinking, `pstack-models.json: ${role}`);
  }
}

checkModelThinking(btw.model, btw.thinkingLevel, "pi-btw.json");
ok(fff.mode === "override", "pi-fff.json: mode must remain override");

ok(sub.toolDescriptionMode === "compact" && sub.artifactDir === "session" && sub.defaultSubagentContext === "fresh" && sub.asyncByDefault === true, "subagent-config.json: compact/session/fresh/async contract mismatch");
ok(Number.isInteger(sub.maxSubagentDepth) && sub.maxSubagentDepth > 0 && sub.maxSubagentDepth <= 2, "subagent-config.json: maxSubagentDepth must be 1..2");
ok(Number.isInteger(sub.maxSubagentSpawnsPerRun) && sub.maxSubagentSpawnsPerRun > 0 && sub.maxSubagentSpawnsPerRun <= 32, "subagent-config.json: spawn bound invalid");
ok(Number.isInteger(sub.globalConcurrencyLimit) && sub.globalConcurrencyLimit > 0 && sub.globalConcurrencyLimit <= 8, "subagent-config.json: global concurrency bound invalid");
ok(Number.isInteger(sub.parallel?.concurrency) && sub.parallel.concurrency > 0 && sub.parallel.concurrency <= 4 && sub.parallel.concurrency <= sub.globalConcurrencyLimit, "subagent-config.json: parallel concurrency bound invalid");
ok(Number.isInteger(sub.parallel?.maxTasks) && sub.parallel.maxTasks > 0 && sub.parallel.maxTasks <= 8, "subagent-config.json: parallel maxTasks invalid");
ok(Number.isFinite(sub.modelExclusions?.defaultTtlMs) && sub.modelExclusions.defaultTtlMs > 0 && sub.modelExclusions.defaultTtlMs <= 300000, "subagent-config.json: exclusion TTL must be <= 5m");
ok(sub.missions?.enabled === false && sub.scheduledRuns?.enabled === false, "subagent-config.json: autonomous missions and schedules must remain disabled");
ok(sub.authorityPolicy?.scheduleCreate === "forbid", "subagent-config.json: schedule creation must be forbidden");
for (const [action, decision] of Object.entries(sub.authorityPolicy || {})) {
  ok(["auto", "confirm", "forbid"].includes(decision), `subagent-config.json: invalid authority decision (${action}:${decision})`);
}

const docker = text("Dockerfile");
ok(/^ARG BASE_IMAGE=.*@sha256:[0-9a-f]{64}$/m.test(docker), "Dockerfile: base image digest pin missing");
for (const name of [
  "PI_VERSION",
  "BUN_VERSION",
  "PI_SUBAGENTS_VERSION",
  "PI_PSTACK_VERSION",
  "PONYTAIL_VERSION",
  "PI_WEB_ACCESS_VERSION",
  "PI_LENS_VERSION",
  "PI_FFF_VERSION",
  "PI_CONTEXT_VIEW_VERSION",
  "PI_POWERLINE_FOOTER_VERSION",
  "PI_REWIND_HOOK_VERSION",
  "PLANNOTATOR_VERSION",
  "PI_BTW_VERSION",
]) {
  ok(new RegExp(`^ARG ${name}=[^\\s$]+$`, "m").test(docker), `Dockerfile: ${name} must have an explicit pin`);
}
for (const needle of [
  "COPY --chown=agent:agent settings.json",
  "COPY --chown=agent:agent models.json",
  "COPY --chown=agent:agent subagent-config.json",
  "COPY --chown=agent:agent pstack-models.json",
  "ENV PI_SUBAGENT_TASK_DELIVERY=file",
  "npm:pi-subagents@${PI_SUBAGENTS_VERSION}",
  "npm:@zenspc/pi-pstack@${PI_PSTACK_VERSION}",
  "npm:@dietrichgebert/ponytail@${PONYTAIL_VERSION}",
]) {
  ok(docker.includes(needle), `Dockerfile: required runtime wiring missing (${needle})`);
}
ok(!docker.includes("AGENTS.md"), "Dockerfile: template-level AGENTS.md must not be copied");
ok(!docker.includes("@piex-dev/dap"), "Dockerfile: DAP must not be installed");
for (const f of ["Dockerfile", "settings.json", "models.json", "pstack-models.json", "pi-btw.json", "subagent-config.json"]) {
  const source = f === "Dockerfile" ? docker : text(f);
  for (const legacy of ["opencode-go", "pi-commandcode-provider", "/alpha/generate"]) {
    ok(!source.includes(legacy), `${f}: retired provider route remains (${legacy})`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}
console.log("template verification: ok");
