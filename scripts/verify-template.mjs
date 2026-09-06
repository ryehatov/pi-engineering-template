#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const errors = [];
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const json = (f) => { try { return JSON.parse(read(f)); } catch (e) { errors.push(`${f}: ${e.message}`); return {}; } };
const ok = (v, m) => { if (!v) errors.push(m); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const seteq = (a, b) => Array.isArray(a) && a.length === b.length && b.every((x) => a.includes(x)) && new Set(a).size === a.length;

const ASTRA = "openai-codex/gpt-6-astra";
const SOL = "openai-codex/gpt-5.6-sol";
const DS = "commandcode-goat/deepseek/deepseek-v4-flash";
const GLM = "commandcode-goat/z-ai/glm-5.3-flash";
const QWEN = "commandcode-goat/Qwen/Qwen3.8-Flash";
const approved = [ASTRA, SOL, DS, GLM, QWEN];
const efforts = {
  "deepseek/deepseek-v4-flash": ["high", "max"],
  "z-ai/glm-5.3-flash": ["low", "high", "max"],
  "Qwen/Qwen3.8-Flash": ["low", "medium", "xhigh"]
};
const roles = {
  "feature, refactoring": `${GLM}:high`,
  "bug-fix": `${GLM}:high`,
  "perf-issue": `${GLM}:high`,
  "hillclimb": `${GLM}:high`,
  "judgment and prose": `${QWEN}:xhigh`,
  "hardest tasks": `${ASTRA}:high`,
  "how explorer": `${DS}:high`,
  "how explainer": `${QWEN}:medium`,
  "how critics": [`${QWEN}:xhigh`, `${GLM}:max`, `${DS}:high`],
  "why investigators": `${GLM}:high`,
  "why synthesizer": `${QWEN}:xhigh`,
  "reflect tooling": `${DS}:high`,
  "reflect judgment, divergent, synthesizer": `${QWEN}:xhigh`,
  "arena runners": [`${GLM}:max`, `${QWEN}:xhigh`, `${DS}:high`],
  "arena cross-judge pool": [`${QWEN}:xhigh`, `${GLM}:max`],
  "swarm workers": `${GLM}:high`,
  "architect runners": [`${ASTRA}:high`, `${GLM}:max`, `${QWEN}:xhigh`],
  "interrogate reviewers": [`${QWEN}:xhigh`, `${GLM}:max`, `${DS}:high`]
};

const required = ["Dockerfile", "AGENTS.md", "README.md", "settings.json", "models.json", "subagent-config.json", "pstack-models.json", "web-search.json", "pi-btw.json", "pi-fff.json", "docs/pi-spec.md", "docs/pi-design.md", "docs/model-policy.md", "docs/operations.md"];
for (const f of required) ok(fs.existsSync(path.join(root, f)), `${f}: missing`);
for (const f of ["skills/development-loop/SKILL.md", "skills/engineering-cache/SKILL.md", "scripts/test-engineering-cache.mjs"]) ok(!fs.existsSync(path.join(root, f)), `${f}: obsolete`);

const settings = json("settings.json");
const models = json("models.json");
const sub = json("subagent-config.json");
const pstack = json("pstack-models.json");
const btw = json("pi-btw.json");
const fff = json("pi-fff.json");

ok(settings.defaultProvider === "openai-codex" && settings.defaultModel === "gpt-6-astra" && settings.defaultThinkingLevel === "low", "settings.json: parent must be Astra/low via openai-codex");
ok(settings.defaultProjectTrust === "never", "settings.json: defaultProjectTrust must be never");
const sa = settings.subagents || {};
ok(sa.defaultModel === GLM && sa.defaultThinking === "high" && sa.maxThinking === "max", "settings.json: generic child must be GLM/high with max ceiling");
ok(sa.modelScope?.enforce === true && sa.modelScope?.strict === true, "settings.json: modelScope must be strict");
ok(seteq(sa.modelScope?.allow, ["inherit", ...approved]), "settings.json: modelScope differs from approved portfolio");

const ao = sa.agentOverrides || {};
for (const [name, model, thinking] of [["scout", DS, "high"], ["researcher", GLM, "high"], ["worker", GLM, "high"], ["reviewer", QWEN, "medium"], ["oracle", SOL, "max"], ["comment-sicko", QWEN, "medium"]]) {
  ok(ao[name]?.model === model && ao[name]?.thinking === thinking, `settings.json: ${name} routing mismatch`);
}
ok(ao.worker?.tools === "inherit", "settings.json: worker tools must inherit");
ok(ao["poteto-agent"]?.model === GLM && ao["poteto-agent"]?.tools === "inherit" && ao["poteto-agent"]?.thinking === "high" && ao["poteto-agent"]?.allowNestedSubagents === true, "settings.json: poteto-agent contract mismatch");
ok(ao.delegate?.disabled === true && ao["gpt-pro"]?.disabled === true, "settings.json: delegate/gpt-pro must be disabled");
for (const name of ["scout", "reviewer", "oracle"]) for (const tool of ["edit", "write", "ast_grep_replace", "lens_diagnostic_mark", "debug"]) ok(!ao[name]?.tools?.includes(tool), `settings.json: ${name} must remain source read-only (${tool})`);

const provider = models.providers?.["commandcode-goat"];
ok(provider && Object.keys(models.providers || {}).length === 1, "models.json: commandcode-goat must be the only custom provider");
ok(provider?.baseUrl === "https://api.commandcode.ai/provider/v1" && provider?.api === "openai-completions", "models.json: Provider API route mismatch");
ok(provider?.apiKey === "$COMMAND_CODE_API_KEY" && provider?.authHeader === true, "models.json: runtime API-key auth mismatch");
ok(provider?.headers?.["x-cmd-zdr"] === "1", "models.json: ZDR header must be hard-coded");
ok(provider?.compat?.supportsStore === false && provider?.compat?.supportsDeveloperRole === false && provider?.compat?.supportsReasoningEffort === true && provider?.compat?.maxTokensField === "max_tokens", "models.json: OpenAI compatibility contract mismatch");
const entries = provider?.models || [];
ok(seteq(entries.map((m) => m.id), Object.keys(efforts)), "models.json: specialist set mismatch");
for (const m of entries) {
  ok(m.reasoning === true && eq(m.input, ["text"]) && m.contextWindow >= 1000000 && m.maxTokens > 0, `models.json: ${m.id} capability metadata invalid`);
  const active = Object.entries(m.thinkingLevelMap || {}).filter(([, v]) => typeof v === "string").map(([k, v]) => `${k}:${v}`);
  ok(seteq(active, efforts[m.id].map((x) => `${x}:${x}`)), `models.json: ${m.id} effort map mismatch`);
}

ok(sub.toolDescriptionMode === "compact" && sub.artifactDir === "session" && sub.defaultSubagentContext === "fresh" && sub.asyncByDefault === true, "subagent-config.json: compact/session/fresh/async-default contract mismatch");
ok(sub.maxSubagentDepth === 2 && sub.maxSubagentSpawnsPerRun > 0 && sub.maxSubagentSpawnsPerRun <= 32, "subagent-config.json: depth/spawn bound invalid");
ok(sub.globalConcurrencyLimit > 0 && sub.globalConcurrencyLimit <= 8 && sub.parallel?.concurrency > 0 && sub.parallel.concurrency <= 4 && sub.parallel.concurrency <= sub.globalConcurrencyLimit, "subagent-config.json: concurrency bound invalid");
ok(sub.parallel?.maxTasks > 0 && sub.parallel.maxTasks <= 8, "subagent-config.json: parallel maxTasks invalid");
ok(sub.modelExclusions?.defaultTtlMs > 0 && sub.modelExclusions.defaultTtlMs <= 300000, "subagent-config.json: exclusion TTL must be <= 5m");
ok(sub.missions?.enabled === false && sub.scheduledRuns?.enabled === false && sub.authorityPolicy?.scheduleCreate === "forbid", "subagent-config.json: autonomous scheduling must remain disabled");

ok(pstack.version === 1 && pstack.skillsEnabled === true, "pstack-models.json: version/skills mismatch");
ok(eq(pstack.roles, roles), "pstack-models.json: curated role matrix mismatch");
for (const selector of Object.values(roles).flatMap((v) => Array.isArray(v) ? v : [v])) {
  const m = selector.match(/^(.*):(low|medium|high|xhigh|max)$/);
  ok(!!m && approved.includes(m?.[1]), `pstack-models.json: invalid selector ${selector}`);
  if (m?.[1].startsWith("commandcode-goat/")) ok(efforts[m[1].slice("commandcode-goat/".length)]?.includes(m[2]), `pstack-models.json: unsupported effort ${selector}`);
}

ok(btw.model === QWEN && btw.thinkingLevel === "medium", "pi-btw.json: must use Qwen/medium");
ok(fff.mode === "override", "pi-fff.json: mode must remain override");

const docker = read("Dockerfile");
ok(/^ARG BASE_IMAGE=.*@sha256:[0-9a-f]{64}$/m.test(docker), "Dockerfile: base image digest pin missing");
for (const [needle, msg] of [["ARG PI_VERSION=0.85.1", "Pi pin"], ["ARG PI_SUBAGENTS_VERSION=0.65.1", "pi-subagents pin"], ["ARG PI_PSTACK_VERSION=0.5.0", "pi-pstack pin"], ["ARG PONYTAIL_VERSION=4.9.0", "Ponytail pin"], ["ARG PI_WEB_ACCESS_VERSION=0.28.0", "pi-web-access pin"], ["ARG PI_POWERLINE_FOOTER_VERSION=0.17.0", "pi-powerline-footer pin"], ["ARG PLANNOTATOR_VERSION=0.27.12", "Plannotator pin"], ["ARG PI_BTW_VERSION=0.57.0", "pi-btw pin"], ["ARG BUN_VERSION=1.4.0", "Bun pin"], ["COPY --chown=agent:agent models.json", "models.json copy"], ["COPY --chown=agent:agent pstack-models.json", "pstack profile copy"], ["ENV CMD_ZDR=1", "CMD_ZDR"], ["ENV PI_SUBAGENT_TASK_DELIVERY=file", "file task delivery"]]) ok(docker.includes(needle), `Dockerfile: ${msg} missing`);
ok(docker.includes("npm:@dietrichgebert/ponytail@${PONYTAIL_VERSION}"), "Dockerfile: Ponytail install missing");
ok(!docker.includes("@piex-dev/dap"), "Dockerfile: DAP must not be installed");
for (const legacy of ["opencode-go", "pi-commandcode-provider", "/alpha/generate"]) ok(!docker.includes(legacy), `Dockerfile: legacy route remains (${legacy})`);
for (const f of ["settings.json", "models.json", "pstack-models.json", "pi-btw.json", "subagent-config.json"]) for (const legacy of ["opencode-go", "pi-commandcode-provider"]) ok(!read(f).includes(legacy), `${f}: legacy route remains (${legacy})`);

const agents = read("AGENTS.md");
for (const phrase of ["Read -> DeepSeek V4 Flash", "Execute -> GLM 5.3 Flash", "Judge -> Qwen 3.8 Flash", "Coordinate -> GPT-6 Astra", "Oracle -> GPT-5.6 Sol", "Qwen3.8-Flash-Next", "x-cmd-zdr", "pstack"]) ok(agents.includes(phrase), `AGENTS.md: missing ${phrase}`);
ok(!agents.includes("GPT-5.6 Luna"), "AGENTS.md: Luna routing must be removed");

if (errors.length) { for (const e of errors) console.error(`FAIL ${e}`); process.exit(1); }
console.log("template verification: ok");
