#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { PACKAGE_PREFIXES } from "./merge-pi-settings.mjs";

const root = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, ".."));
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const exists = name => fs.existsSync(path.join(root, name));
function read(name) {
  try { return fs.readFileSync(path.join(root, name), "utf8"); }
  catch (e) { errors.push(name + ": " + e.message); return ""; }
}
function json(name) {
  try { return JSON.parse(read(name)); }
  catch (e) { errors.push(name + ": invalid JSON: " + e.message); return {}; }
}

const required = [
  "Dockerfile", "README.md", "settings.json", "pstack-models.md",
  "sol-pi.json", "pi-context-view.json", "web-search.json", "pi-btw.json",
  "pi-fff.json", "docs/model-policy.md", "docs/operations.md",
  "skills/LICENSE.mattpocock", "skills/domain-modeling/SKILL.md",
  "skills/grilling/SKILL.md", "skills/retro/SKILL.md",
  "skills/writing-for-agents/SKILL.md",
  "scripts/merge-pi-settings.mjs", "scripts/merge-pi-settings.test.mjs",
  "scripts/pstack-auth-launcher.sh", "scripts/pstack-auth-launcher.test.mjs", ".dockerignore"
];
for (const file of required) check(exists(file), file + ": missing");

const retired = [
  "pstack-models.json", "subagent-config.json", "scripts/patch-pstack.mjs",
  "agents/how-analyst.md", "docs/pi-design.md", "docs/pi-spec.md",
  "models.json", "AGENTS.md", "pi-goal.json"
];
for (const file of retired) check(!exists(file), "Retired file remains: " + file);

const docker = read("Dockerfile");
const pins = {
  PI_VERSION: "1.4.0",
  BUN_VERSION: "1.4.3",
  CLAUDE_CODE_VERSION: "2.1.308",
  PI_ACCOUNTS_VERSION: "0.53.2",
  PONYTAIL_VERSION: "5.3.2",
  PI_WEB_ACCESS_VERSION: "0.44.0",
  PI_LENS_VERSION: "4.4.4",
  PI_FFF_VERSION: "0.11.0",
  PI_CONTEXT_VIEW_VERSION: "0.7.2",
  PI_POWERLINE_FOOTER_VERSION: "0.20.2",
  PI_REWIND_HOOK_VERSION: "1.8.7",
  PI_BTW_VERSION: "0.62.0",
  PSTACK_CLAUDE_REF: "903e7385382389806c59d6989b6274e24165082b",
  PI_CLAUDE_CODE_REF: "70abb65186592ca788b29b3db22c3160d629c41f",
  SOL_PI_REF: "219568034fa54ed121ede80961655e33dfb9d0e3"
};
for (const [key, value] of Object.entries(pins)) {
  check(docker.split(/\r?\n/).includes("ARG " + key + "=" + value), "Docker pin mismatch: " + key);
}
check(/^ARG BASE_IMAGE=[^\r\n]+@sha256:[a-f0-9]{64}$/m.test(docker), "Docker base image digest is not pinned");

const installs = [
  'pi install "git:github.com/michael-denyer/pstack-claude@${PSTACK_CLAUDE_REF}"',
  'test -f /home/agent/.pi/agent/git/github.com/michael-denyer/pstack-claude/plugins/pstack/pi/index.ts',
  'pi install "git:github.com/earendil-works/pi-claude-code@${PI_CLAUDE_CODE_REF}"',
  'test -f /home/agent/.pi/agent/git/github.com/earendil-works/pi-claude-code/src/index.ts',
  'pi install "git:github.com/NVlabs/SoL-Pi@${SOL_PI_REF}"'
];
for (const item of installs) check(docker.includes(item), "Docker Git install or package entrypoint check missing: " + item);
const cliInstall = 'npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"';
check(docker.includes(cliInstall) && docker.includes("&& claude --version") &&
      docker.indexOf(cliInstall) < docker.indexOf("USER agent") &&
      !docker.includes('npm install -g --ignore-scripts "@anthropic-ai/claude-code'),
  "Claude Code CLI install/verification must be pinned in the root image layer");
const launcherCopy = "COPY --chmod=755 scripts/pstack-auth-launcher.sh /usr/local/libexec/pstack-auth-launcher";
check(docker.includes(launcherCopy) &&
      docker.includes("for tool in pi claude; do") &&
      docker.includes('mv "$binary" "$binary.pstack-upstream"') &&
      docker.includes('ln -s /usr/local/libexec/pstack-auth-launcher "$binary"') &&
      docker.indexOf(launcherCopy) > docker.indexOf(cliInstall) &&
      docker.indexOf("USER agent") > docker.indexOf('ln -s /usr/local/libexec/pstack-auth-launcher "$binary"'),
  "Pi and Claude CLI must be wrapped before runtime");
const launcher = read("scripts/pstack-auth-launcher.sh");
check(launcher.includes("unset ANTHROPIC_API_KEY") &&
      launcher.includes('exec "$0.pstack-upstream" "$@"') &&
      launcher.includes('exec "$(command -v "$name").pstack-upstream" "$@"') &&
      !/ANTHROPIC_(AUTH_TOKEN|BASE_URL|FOUNDRY_API_KEY)|CLAUDE_CONFIG_DIR|SBX_CRED_ANTHROPIC_MODE/.test(launcher),
  "Pi and Claude launcher must only unset ANTHROPIC_API_KEY");
check(docker.includes("pi-claude-code requires Node >=22.19.0"),
  "pi-claude-code Node >=22.19.0 preflight must remain in the Docker image");
check(!/^(?:ARG|ENV) PI_CLAUDE_CODE_ALLOW_USAGE_CREDITS=/m.test(docker),
  "Claude usage credits must not be automatically enabled in the image");
const copies = [
  ["settings.json", "/tmp/pi-template-settings.json"],
  ["scripts/merge-pi-settings.mjs", "/tmp/merge-pi-settings.mjs"],
  ["pstack-models.md", "/home/agent/.pi/agent/pstack-models.md"],
  ["sol-pi.json", "/home/agent/.pi/agent/sol-pi.json"],
  ["pi-context-view.json", "/home/agent/.pi/agent/extensions/pi-context-view.json"],
  ["web-search.json", "/home/agent/.pi/agent/web-search.json"],
  ["pi-btw.json", "/home/agent/.pi/agent/pi-btw.json"],
  ["pi-fff.json", "/home/agent/.pi/agent/pi-fff.json"],
  ["skills/", "/home/agent/.pi/agent/skills/"]
];
for (const [src, dst] of copies) {
  check(docker.includes("COPY --chown=agent:agent " + src + " " + dst),
    "Docker COPY missing: " + src);
}
const installSources = [...docker.matchAll(/pi install "((?:npm:|git:)[^"]+)"/g)]
  .map(match => match[1].replace(/[$][{][A-Z0-9_]+[}]/g, ""));
check(installSources.length === PACKAGE_PREFIXES.length &&
      new Set(installSources).size === PACKAGE_PREFIXES.length &&
      PACKAGE_PREFIXES.every(prefix => installSources.includes(prefix)),
  "Docker package set does not match the registered package policy");

const packageInstall = docker.indexOf('RUN pi install "npm:@narumitw/pi-accounts');
const lastInstall = docker.indexOf('pi install "git:github.com/NVlabs/SoL-Pi@');
const templateCopy = docker.indexOf("COPY --chown=agent:agent settings.json /tmp/pi-template-settings.json");
const mergeCommand = docker.indexOf("RUN node /tmp/merge-pi-settings.mjs");
const skillsCopy = docker.indexOf("COPY --chown=agent:agent skills/");
check(packageInstall >= 0 && lastInstall > packageInstall &&
      templateCopy > lastInstall && mergeCommand > templateCopy &&
      skillsCopy > mergeCommand &&
      docker.includes("/tmp/pi-template-settings.json \\\n      /home/agent/.pi/agent/settings.json") &&
      !docker.includes("COPY --chown=agent:agent settings.json /home/agent/.pi/agent/settings.json"),
  "Docker package caching or settings registration order mismatch");

const dockerignore = read(".dockerignore");
check(dockerignore.includes(".git") && dockerignore.includes("node_modules") &&
      !dockerignore.includes("merge-pi-settings.mjs"),
  "Docker context filtering missing or excludes the merge script");
for (const forbidden of ["@zenspc/pi-pstack", "npm:pi-subagents", "patch-pstack",
  "subagent-config.json", "pstack-models.json", "@gotgenes/pi-anthropic-auth",
  "openai-codex", "COMMAND_CODE_API_KEY", "@narumitw/pi-goal", "PI_GOAL_VERSION",
  "PSTACK_CLAUDE_VERSION", "SOL_PI_VERSION",
  "/pstack-claude/package.json", "/SoL-Pi/package.json"]) {
  check(!docker.includes(forbidden), "Retired runtime reference: " + forbidden);
}
check(/^ENV TZ=Asia\/Tokyo$/m.test(docker), "Timezone is not Asia/Tokyo");

const settings = json("settings.json");
check(settings.$schema === "https://pi.dev/schemas/settings.schema.json", "Pi settings schema mismatch");
check(settings.defaultProvider === "openai" && settings.defaultModel === "gpt-6.1-sol" &&
      settings.defaultThinkingLevel === "xhigh", "Pi parent model/effort mismatch");
check(settings.defaultProjectTrust === "never", "Project trust must remain never");
check(!Object.hasOwn(settings, "subagents"), "Obsolete pi-subagents settings remain");
check(JSON.stringify(settings.defaultTools) === '["+codemode"]' &&
      settings.codemode?.mode === "on", "Pi Codemode must stay additive");
check(!settings.powerline?.layout?.left?.includes("subagents"),
  "Powerline refers to the removed subagents extension");

const expectedModels = new Map([
  ["opus", "openai/gpt-6.1-sol"],
  ["fable", "openai/gpt-6-astra"],
  ["sonnet", "claude-code/claude-opus-5-5"],
  ["haiku", "claude-code/claude-sonnet-5-5"]
]);
const singleRoles = new Map([
  ["feature, refactoring", "opus"], ["bug-fix", "opus"],
  ["perf-issue", "fable"], ["hillclimb", "fable"],
  ["judgment and prose", "opus"], ["strongest judgment", "fable"],
  ["how explorer", "opus"], ["how explainer", "fable"],
  ["why investigators", "opus"], ["why synthesizer", "fable"],
  ["reflect tooling", "opus"], ["reflect judgment, divergent, synthesizer", "fable"],
  ["swarm workers", "opus"]
]);
const panels = ["arena runners", "arena cross-judge pool", "architect runners", "interrogate reviewers"];
const allowedKeys = new Set([...singleRoles.keys(), ...panels, "pi models", "default effort", "session hook"]);
const sheet = new Map();
for (const line of read("pstack-models.md").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const match = /^([^:]+):\s*(.+)$/.exec(trimmed);
  if (!match) { errors.push("Unparseable pstack sheet line: " + trimmed); continue; }
  const [, key, value] = match;
  check(allowedKeys.has(key), "Unknown pstack sheet key: " + key);
  check(!sheet.has(key), "Duplicate pstack sheet key: " + key);
  sheet.set(key, value.trim());
}
check(sheet.size === allowedKeys.size && [...allowedKeys].every(key => sheet.has(key)),
  "pstack sheet role coverage mismatch");
check(sheet.get("default effort") === "xhigh" && sheet.get("session hook") === "on",
  "pstack session routing or default effort mismatch");

const actualModels = new Map();
const mapping = sheet.get("pi models") || "";
for (const pair of mapping.split(",")) {
  const match = /^\s*(opus|fable|sonnet|haiku)=([a-z-]+\/[A-Za-z0-9._-]+)\s*$/.exec(pair);
  if (!match) { errors.push("Invalid pi models mapping: " + pair); continue; }
  check(!actualModels.has(match[1]), "Duplicate Pi model alias: " + match[1]);
  actualModels.set(match[1], match[2]);
}
check(actualModels.size === expectedModels.size && new Set(actualModels.values()).size === 4 &&
      [...expectedModels].every(([alias, id]) => actualModels.get(alias) === id),
  "pstack Pi aliases must resolve to the qualified four-model portfolio");

for (const [role, expected] of singleRoles) {
  check(sheet.get(role) === expected, "pstack role model mismatch: " + role);
}
for (const role of panels) {
  const entries = (sheet.get(role) || "").split(",").map(x => x.trim()).filter(Boolean);
  const seen = new Set();
  for (const entry of entries) {
    const match = /^(opus|fable|sonnet|haiku)(?: @(low|medium|high|xhigh|max))?$/.exec(entry);
    if (!match) { errors.push("Invalid panel selector for " + role + ": " + entry); continue; }
    const [, alias, effort] = match;
    seen.add(alias);
    if (alias === "sonnet" || alias === "haiku")
      check(effort === "high", "Claude Code reviewer effort must be high: " + role);
    else
      check(effort === undefined || effort === "xhigh",
        "OpenAI panel effort must be xhigh: " + role);
  }
  check(entries.length === 4 && seen.size === 4 &&
        [...expectedModels.keys()].every(alias => seen.has(alias)),
    "pstack panel must contain four distinct model aliases: " + role);
}

const sol = json("sol-pi.json");
check(sol.version === 1 && sol.actionFusion === true && sol.observationPack === true &&
      sol.evidencePreservingReducer === false && sol.onlineContextCompact === false &&
      sol.cacheWriteReadRatio === 12.5, "SoL-Pi context optimization mismatch");
check(json("pi-context-view.json").autoProbing === false, "Context viewer auto-probing must remain off");
const web = json("web-search.json");
check(web.toolActivation === "auto" && web.toolExposure === "direct" &&
      web.workflow === "none" && web.searchRouting?.useCurrentModel === true,
  "Web tools routing mismatch");
check(json("pi-fff.json").mode === "override", "FFF mode mismatch");
const btw = json("pi-btw.json");
check(btw.model === "openai/gpt-6-astra" && btw.thinkingLevel === "high",
  "Side-question model mismatch");

if (errors.length) {
  for (const error of errors) console.error("FAIL " + error);
  process.exit(1);
}
console.log("pstack-claude template verification: ok");
