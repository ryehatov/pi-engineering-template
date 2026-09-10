#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const errors = [];
const filePath = (file) => path.join(root, file);
const exists = (file) => fs.existsSync(filePath(file));
const ok = (value, message) => { if (!value) errors.push(message); };
const text = (file) => {
  try { return fs.readFileSync(filePath(file), "utf8"); }
  catch (error) { errors.push(`${file}: ${error.message}`); return ""; }
};
const json = (file) => {
  const source = text(file);
  if (!source) return {};
  try { return JSON.parse(source); }
  catch (error) { errors.push(`${file}: ${error.message}`); return {}; }
};

const required = [
  "Dockerfile",
  "settings.json",
  "models.json",
  "subagent-config.json",
  "pstack-models.json",
  "web-search.json",
  "pi-btw.json",
  "pi-fff.json",
];
for (const file of required) ok(exists(file), `${file}: missing`);
ok(!exists("AGENTS.md"), "AGENTS.md: template-level global agent prompt must remain absent");

const thinkingLevels = new Set(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);
const parseSelector = (value) => {
  if (typeof value !== "string" || value.length === 0) return null;
  const split = value.lastIndexOf(":");
  if (split <= 0) return { model: value, thinking: null };
  const thinking = value.slice(split + 1);
  return thinkingLevels.has(thinking)
    ? { model: value.slice(0, split), thinking }
    : { model: value, thinking: null };
};

const settings = json("settings.json");
const models = json("models.json");
const sub = json("subagent-config.json");
const pstack = json("pstack-models.json");
const btw = json("pi-btw.json");
const fff = json("pi-fff.json");

ok(typeof settings.defaultProvider === "string" && settings.defaultProvider.length > 0, "settings.json: defaultProvider missing");
ok(typeof settings.defaultModel === "string" && settings.defaultModel.length > 0, "settings.json: defaultModel missing");
ok(thinkingLevels.has(settings.defaultThinkingLevel), "settings.json: invalid defaultThinkingLevel");
ok(settings.defaultProjectTrust === "never", "settings.json: defaultProjectTrust must remain never");

const subagents = settings.subagents || {};
const scope = subagents.modelScope || {};
const allow = Array.isArray(scope.allow) ? scope.allow : [];
ok(scope.enforce === true && scope.strict === true, "settings.json: subagent modelScope must be strict and enforced");
ok(allow.includes("inherit"), "settings.json: modelScope must include inherit");
ok(new Set(allow).size === allow.length, "settings.json: modelScope contains duplicate entries");
for (const model of allow.filter((value) => value !== "inherit")) {
  ok(typeof model === "string" && model.includes("/") && !model.includes("*"), `settings.json: modelScope entry must be explicit and provider-qualified (${model})`);
}
const allowedModels = new Set(allow.filter((value) => value !== "inherit"));
const parentModel = `${settings.defaultProvider}/${settings.defaultModel}`;
ok(allowedModels.has(parentModel), `settings.json: parent model is outside strict modelScope (${parentModel})`);

const providers = models.providers || {};
const commandCode = providers["commandcode-goat"];
ok(commandCode && typeof commandCode === "object", "models.json: commandcode-goat provider missing");
if (commandCode) {
  ok(commandCode.baseUrl === "https://api.commandcode.ai/provider/v1", "models.json: Command Code API URL mismatch");
  ok(commandCode.api === "openai-completions", "models.json: Command Code API adapter mismatch");
  ok(commandCode.apiKey === "$COMMAND_CODE_API_KEY" && commandCode.authHeader === true, "models.json: runtime API-key auth mismatch");
  ok(commandCode.headers?.["x-cmd-zdr"] === "1", "models.json: Command Code ZDR header must be enforced");
}

const customThinking = new Map();
for (const [providerName, provider] of Object.entries(providers)) {
  const catalog = Array.isArray(provider?.models) ? provider.models : [];
  ok(new Set(catalog.map((model) => model.id)).size === catalog.length, `models.json: duplicate model ids in ${providerName}`);
  for (const model of catalog) {
    ok(typeof model.id === "string" && model.id.length > 0, `models.json: model id missing in ${providerName}`);
    const qualified = `${providerName}/${model.id}`;
    ok(allowedModels.has(qualified), `models.json: custom model is outside strict modelScope (${qualified})`);
    ok(Array.isArray(model.input) && model.input.length > 0, `models.json: input capability missing (${qualified})`);
    ok(Number.isFinite(model.contextWindow) && model.contextWindow > 0, `models.json: invalid contextWindow (${qualified})`);
    ok(Number.isFinite(model.maxTokens) && model.maxTokens > 0, `models.json: invalid maxTokens (${qualified})`);

    const map = model.thinkingLevelMap;
    if (map && typeof map === "object") {
      const active = new Set(
        Object.entries(map)
          .filter(([, value]) => typeof value === "string" && value.length > 0)
          .map(([level]) => level),
      );
      ok([...active].every((level) => thinkingLevels.has(level)), `models.json: invalid thinkingLevelMap (${qualified})`);
      customThinking.set(qualified, active);
    }
  }
}
for (const model of allowedModels) {
  if (!model.includes("/")) continue;
  const providerName = model.slice(0, model.indexOf("/"));
  if (providers[providerName]) {
    const ids = new Set((providers[providerName].models || []).map((entry) => `${providerName}/${entry.id}`));
    ok(ids.has(model), `settings.json: scoped custom model missing from models.json (${model})`);
  }
}

const checkModel = (model, thinking, label) => {
  ok(typeof model === "string" && allowedModels.has(model), `${label}: model outside strict modelScope (${model})`);
  if (thinking == null) return;
  ok(thinkingLevels.has(thinking), `${label}: invalid thinking level (${thinking})`);
  const supported = customThinking.get(model);
  if (supported) ok(supported.has(thinking), `${label}: unsupported thinking level (${model}:${thinking})`);
};

checkModel(subagents.defaultModel, subagents.defaultThinking, "settings.json: subagent default");
ok(thinkingLevels.has(subagents.maxThinking), "settings.json: invalid subagent maxThinking");
for (const [name, config] of Object.entries(subagents.agentOverrides || {})) {
  if (!config || config.disabled === true) continue;
  if (config.model) checkModel(config.model, config.thinking ?? subagents.defaultThinking, `settings.json: agentOverrides.${name}`);
  if (config.fallbackModels !== undefined) {
    ok(Array.isArray(config.fallbackModels), `settings.json: agentOverrides.${name}.fallbackModels must be an array`);
    if (Array.isArray(config.fallbackModels)) {
      for (const rawSelector of config.fallbackModels) {
        const parsed = parseSelector(rawSelector);
        ok(parsed !== null, `settings.json: agentOverrides.${name}.fallbackModels contains an invalid selector`);
        if (parsed) checkModel(parsed.model, parsed.thinking, `settings.json: agentOverrides.${name}.fallbackModels`);
      }
    }
  }
}

ok(pstack.version === 1, "pstack-models.json: unsupported version");
ok(pstack.skillsEnabled === true, "pstack-models.json: skills must remain enabled");
ok(pstack.roles && typeof pstack.roles === "object" && !Array.isArray(pstack.roles) && Object.keys(pstack.roles).length > 0, "pstack-models.json: roles missing");
for (const [role, raw] of Object.entries(pstack.roles || {})) {
  const selectors = Array.isArray(raw) ? raw : [raw];
  ok(selectors.length > 0, `pstack-models.json: empty selector list (${role})`);
  for (const rawSelector of selectors) {
    const parsed = parseSelector(rawSelector);
    ok(parsed !== null, `pstack-models.json: invalid selector (${role})`);
    ok(parsed?.thinking !== null, `pstack-models.json: selector must include thinking (${rawSelector})`);
    if (parsed) checkModel(parsed.model, parsed.thinking, `pstack-models.json: ${role}`);
  }
}

checkModel(btw.model, btw.thinkingLevel, "pi-btw.json");
ok(fff.mode === "override", "pi-fff.json: mode must remain override");

for (const [name, value] of [
  ["maxSubagentDepth", sub.maxSubagentDepth],
  ["maxSubagentSpawnsPerRun", sub.maxSubagentSpawnsPerRun],
  ["globalConcurrencyLimit", sub.globalConcurrencyLimit],
  ["parallel.maxTasks", sub.parallel?.maxTasks],
  ["parallel.concurrency", sub.parallel?.concurrency],
]) {
  ok(Number.isInteger(value) && value > 0, `subagent-config.json: ${name} must be a positive integer`);
}
if (Number.isInteger(sub.parallel?.concurrency) && Number.isInteger(sub.globalConcurrencyLimit)) {
  ok(sub.parallel.concurrency <= sub.globalConcurrencyLimit, "subagent-config.json: parallel concurrency exceeds global concurrency");
}
if (sub.modelExclusions?.defaultTtlMs !== undefined) {
  ok(Number.isFinite(sub.modelExclusions.defaultTtlMs) && sub.modelExclusions.defaultTtlMs > 0, "subagent-config.json: exclusion TTL must be positive");
}
ok(sub.defaultSubagentContext === "fresh", "subagent-config.json: delegated context must remain fresh");
ok(sub.missions?.enabled === false, "subagent-config.json: missions must remain disabled");
ok(sub.scheduledRuns?.enabled === false, "subagent-config.json: scheduled runs must remain disabled");
ok(sub.authorityPolicy?.scheduleCreate === "forbid", "subagent-config.json: schedule creation must remain forbidden");
for (const [action, decision] of Object.entries(sub.authorityPolicy || {})) {
  ok(["auto", "confirm", "forbid"].includes(decision), `subagent-config.json: invalid authority decision (${action}:${decision})`);
}

const docker = text("Dockerfile");
ok(/^ARG BASE_IMAGE=.*@sha256:[0-9a-f]{64}$/m.test(docker), "Dockerfile: base image digest pin missing");
const versionArgs = [...docker.matchAll(/^ARG ([A-Z0-9_]+_VERSION)=([^\s$]+)$/gm)];
ok(versionArgs.length > 0, "Dockerfile: no explicit version pins found");
for (const [, name, value] of versionArgs) ok(value.length > 0, `Dockerfile: ${name} version pin missing`);
for (const needle of [
  "COPY --chown=agent:agent settings.json",
  "COPY --chown=agent:agent models.json",
  "COPY --chown=agent:agent subagent-config.json",
  "COPY --chown=agent:agent pstack-models.json",
  "npm:pi-subagents@${PI_SUBAGENTS_VERSION}",
  "npm:@zenspc/pi-pstack@${PI_PSTACK_VERSION}",
]) {
  ok(docker.includes(needle), `Dockerfile: required runtime wiring missing (${needle})`);
}
ok(!docker.includes("AGENTS.md"), "Dockerfile: template-level AGENTS.md must not be copied");
for (const source of [docker, text("settings.json"), text("models.json"), text("pstack-models.json"), text("subagent-config.json")]) {
  for (const legacy of ["opencode-go", "pi-commandcode-provider", "/alpha/generate", "deepseek-v4.1-flash-beta"]) {
    ok(!source.includes(legacy), `retired provider/model route remains (${legacy})`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}
console.log("template verification: ok");
