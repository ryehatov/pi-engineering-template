#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const errors = [];
const ok = (v, msg) => { if (!v) errors.push(msg); };
const has = (file) => fs.existsSync(path.join(root, file));
const text = (file) => { try { return fs.readFileSync(path.join(root, file), "utf8"); } catch (e) { errors.push(file+": "+e.message); return ""; } };
const json = (file) => { try { return JSON.parse(text(file)); } catch (e) { errors.push(file+": "+e.message); return {}; } };
for (const name of ["Dockerfile","settings.json","pstack-models.json","subagent-config.json","sol-pi.json","web-search.json","pi-context-view.json","pi-goal.json","pi-btw.json","pi-fff.json","scripts/patch-pstack.mjs","agents/how-analyst.md","skills/LICENSE.mattpocock","skills/grill-with-docs/SKILL.md","skills/domain-modeling/SKILL.md","skills/domain-modeling/CONTEXT-FORMAT.md","skills/domain-modeling/ADR-FORMAT.md","skills/grilling/SKILL.md","skills/retro/SKILL.md","skills/writing-for-agents/SKILL.md","skills/writing-for-agents/SKILL-MECHANICS.md"]) ok(has(name), name+": missing");
ok(!has("models.json") && !has("AGENTS.md"), "retired custom provider or generic global agent prompt remains");
const pins = new Map([["PI_VERSION","1.3.0"],["BUN_VERSION","1.4.3"],["PI_ACCOUNTS_VERSION","0.53.2"],["PI_SUBAGENTS_VERSION","0.80.0"],["PI_PSTACK_VERSION","0.6.0"],["PONYTAIL_VERSION","5.3.2"],["PI_WEB_ACCESS_VERSION","0.44.0"],["PI_LENS_VERSION","4.4.4"],["PI_FFF_VERSION","0.11.0"],["PI_CONTEXT_VIEW_VERSION","0.7.2"],["PI_POWERLINE_FOOTER_VERSION","0.20.2"],["PI_REWIND_HOOK_VERSION","1.8.7"],["PI_BTW_VERSION","0.62.0"],["PI_GOAL_VERSION","0.54.13"]]);
const docker = text("Dockerfile");
for (const [key,value] of pins) ok(new RegExp("^ARG "+key+"="+value.replaceAll(".", "\\.")+"$", "m").test(docker), "Dockerfile pin drift: "+key);
ok(/^ARG BASE_IMAGE=.*@sha256:[0-9a-f]{64}$/m.test(docker), "Docker base image digest pin missing");
ok(docker.includes("ARG SOL_PI_VERSION=0.1.1") &&
   docker.includes("ARG SOL_PI_REF=219568034fa54ed121ede80961655e33dfb9d0e3"), "SoL-Pi manifest version or official Git ref drift");
ok(docker.includes('pi install "git:github.com/NVlabs/SoL-Pi@${SOL_PI_REF}"') &&
   docker.includes('test "$(node -p \'require("/home/agent/.pi/agent/git/github.com/NVlabs/SoL-Pi/package.json").version\')" = "${SOL_PI_VERSION}"') &&
   !docker.includes("SOL_PI_COMMIT") &&
   !docker.includes("npm:@herbertgao/sol-pi"), "SoL-Pi official Git install or version assertion mismatch");
for (const x of ["npm:pi-subagents@\u0024{PI_SUBAGENTS_VERSION}","npm:@zenspc/pi-pstack@\u0024{PI_PSTACK_VERSION}","npm:@narumitw/pi-accounts@\u0024{PI_ACCOUNTS_VERSION}","node /tmp/patch-pstack.mjs","COPY --chown=agent:agent settings.json","COPY --chown=agent:agent pstack-models.json","COPY --chown=agent:agent subagent-config.json","COPY --chown=agent:agent pi-context-view.json","COPY --chown=agent:agent skills/"]) ok(docker.includes(x), "Docker runtime wiring missing: "+x);
// Inspect complete COPY/ADD source tokens, not "pstack-models.json" suffixes.
const dockerInstructions = docker.replace(/\\\r?\n\s*/g, " ").split(/\r?\n/);
const copiesLegacyModels = dockerInstructions.some(line =>
  /^\s*(?:COPY|ADD)\b/i.test(line) && /(?:^|\s)models\.json(?=\s|$)/.test(line)
);
ok(!copiesLegacyModels && !docker.includes("/home/agent/.pi/agent/models.json") &&
  !docker.includes("@anthropic-ai/claude-code") && !docker.includes("CLAUDE_CODE_VERSION") &&
  /^ENV TZ=Asia\/Tokyo$/m.test(docker), "Docker provider, CLI dependency or timezone mismatch");
const s = json("settings.json"), p = json("pstack-models.json"), sub = json("subagent-config.json"), so = json("sol-pi.json"), w = json("web-search.json"), cv = json("pi-context-view.json"), btw = json("pi-btw.json"), goal = json("pi-goal.json"), fff = json("pi-fff.json");
const openai = new Set(["openai/gpt-6.1-sol","openai/gpt-6-astra"]);
const claude = new Set(["anthropic/claude-opus-5-5","anthropic/claude-sonnet-5-5","anthropic/claude-haiku-5-5"]);
const native = new Set([...openai,...claude]);
ok(s.$schema==="https://pi.dev/schemas/settings.schema.json" && Array.isArray(s.defaultTools) && s.defaultTools.length===1 && s.defaultTools[0]==="+codemode" && s.codemode?.mode==="on", "Pi 1.3 settings schema or additive Codemode mismatch");
ok(s.defaultProvider==="openai" && s.defaultModel==="gpt-6.1-sol" && s.defaultThinkingLevel==="xhigh" && s.defaultProjectTrust==="never","Parent model/provider/trust mismatch");
const sa=s.subagents||{}, scope=sa.modelScope||{}, a=sa.agentOverrides||{};
ok(sa.defaultModel==="openai/gpt-6.1-sol" && sa.defaultThinking==="xhigh" && sa.maxThinking==="max","Subagent defaults mismatch");
ok(scope.enforce===true && scope.strict===true,"Model scope is not strict");
const allow=new Set(scope.allow||[]);
ok(Array.isArray(scope.allow) && allow.size === 5 &&
  [...native].every(model => allow.has(model)), "Model scope portfolio mismatch");
for (const [name,cfg] of Object.entries(a)) {
 if (cfg.disabled) continue;
  ok(name==="reviewer" ? claude.has(cfg.model) : openai.has(cfg.model), "Invalid role model: "+name);
 ok(["high","xhigh"].includes(cfg.thinking), "Invalid role effort: "+name);
 ok(cfg.fallbackModels===undefined,"Unapproved fallback: "+name);
 ok(name==="worker"||name==="poteto-agent" ? cfg.tools==="inherit" : cfg.tools===undefined, "Role tool ownership drift: "+name);
}
ok(a["claude-code"]?.disabled===true && a["claude-code-writer"]?.disabled===true && !scope.agents?.["claude-code"], "External CLI agents must remain disabled");
ok(a.oracle?.model==="openai/gpt-6-astra" && a.reviewer?.model==="anthropic/claude-opus-5-5" && a.reviewer?.thinking==="high", "Oracle or independent native reviewer mismatch");
// These pstack workflows dispatch Astra to worker/poteto roles for synthesis.
const delegatedOpenAI = new Set([...openai]);
const delegatedRoles = [
  "feature, refactoring", "bug-fix", "perf-issue", "hillclimb", "hardest tasks",
  "why investigators", "why synthesizer", "reflect tooling",
  "reflect judgment, divergent, synthesizer", "arena runners",
  "swarm workers", "architect runners",
];
const requiredDelegatedModels = new Set(
  delegatedRoles.flatMap(name => {
    const value = p.roles?.[name];
    return (Array.isArray(value) ? value : [value]).map(selector =>
      typeof selector === "string" ? selector.split(":")[0] : null
    );
  })
);
for (const name of ["worker", "poteto-agent"]) {
  const scoped = scope.agents?.[name]?.allow;
  ok(Array.isArray(scoped) && scoped.length === delegatedOpenAI.size &&
    scoped.every(model => delegatedOpenAI.has(model)) &&
    [...requiredDelegatedModels].every(model => scoped.includes(model)),
    "pstack delegated model scope mismatch: " + name);
}
for (const name of ["scout", "researcher", "comment-sicko"]) {
  const scoped = scope.agents?.[name]?.allow;
  ok(Array.isArray(scoped) && scoped.length === 1 && scoped[0] === "openai/gpt-6.1-sol",
    "Scout/researcher scope widened: " + name);
}
const reviewerScope = scope.agents?.reviewer?.allow;
ok(Array.isArray(reviewerScope) && reviewerScope.length === 3 &&
  reviewerScope.every(model => claude.has(model)), "Native reviewer Claude scope mismatch");
ok(/^tools: read, grep, find, ls$/m.test(text("agents/how-analyst.md")),"how-analyst tools mismatch");
const keys=["feature, refactoring","bug-fix","perf-issue","hillclimb","judgment and prose","hardest tasks","how explorer","how explainer","why investigators","why synthesizer","reflect tooling","reflect judgment, divergent, synthesizer","arena runners","arena cross-judge pool","swarm workers","architect runners","interrogate reviewers"];
ok(p.version===1 && p.skillsEnabled===true && p.roles && Object.keys(p.roles).length===keys.length,"pstack role contract mismatch");
const arrays=new Set(["arena runners","arena cross-judge pool","architect runners","interrogate reviewers"]);
for(const name of keys) {
 const v=p.roles?.[name], vals=Array.isArray(v)?v:[v], isJudge=name==="arena cross-judge pool"||name==="interrogate reviewers";
 ok(Array.isArray(v)===arrays.has(name) && vals.length>0, "Role shape mismatch: "+name);
 for(const x of vals) {
  const parts=typeof x==="string"?x.split(":"):[];
  const model=parts[0],thinking=parts[1];
  ok(parts.length===2 && (isJudge ? claude.has(model)&&thinking==="high" : openai.has(model)&&["high","xhigh"].includes(thinking)), "Invalid selector "+name+": "+x);
 }
}
const patch=text("scripts/patch-pstack.mjs");
ok(patch.includes("agent: \\\"reviewer\\\"") && patch.includes("anthropic/...") && !patch.includes("claude-code/"),"pstack native reviewer routing mismatch");
ok(so.actionFusion===true && so.observationPack===true && so.evidencePreservingReducer===false && so.onlineContextCompact===false && so.cacheWriteReadRatio===12.5,"SoL-Pi mechanism mismatch");
ok(cv.autoProbing===false, "pi-context-view must not run silent probe on startup");
ok(w.toolActivation==="auto" && w.toolExposure==="direct", "Researcher web tools must remain directly available");
ok(w.workflow === "none" && Array.isArray(w.searchRouting?.providers) &&
  w.searchRouting.providers.join(",") === "openai,exa" &&
  w.searchRouting.useCurrentModel === true, "Web search routing mismatch");
ok(btw.model==="openai/gpt-6-astra" && btw.thinkingLevel==="high","Side-question model mismatch");
ok(fff.mode==="override","FFF mode mismatch");
ok(goal.continuationLimits?.automaticTurns===64 && goal.continuationLimits?.noProgressTurns===3 && goal.rpc?.enabled===false,"Goal bounds mismatch");
ok(sub.toolActivation==="auto" && sub.pinToolDeclarations===true && sub.maxSubagentSpawnsPerSession===128 && sub.maxActiveAsyncRunsPerSession===4 && sub.maxActiveAsyncRunsPerSession<=sub.globalConcurrencyLimit, "Subagent activation, cache stability, or session bounds mismatch");
ok(sub.defaultSubagentContext==="fresh" && sub.missions?.enabled===false && sub.scheduledRuns?.enabled===false && sub.authorityPolicy?.scheduleCreate==="forbid","Delegation policy mismatch");
for(const key of ["maxSubagentDepth","maxSubagentSpawnsPerRun","globalConcurrencyLimit"])ok(Number.isInteger(sub[key])&&sub[key]>0,"Invalid delegation limit "+key);
ok(sub.parallel?.concurrency>0 && sub.parallel.concurrency<=sub.globalConcurrencyLimit,"Parallel concurrency unbounded");
for(const legacy of ["openai-codex","commandcode-goat","COMMAND_CODE_API_KEY","multi_grep","lsp_diagnostics"])for(const [name,source] of [["Dockerfile",docker],["settings.json",text("settings.json")],["pstack-models.json",text("pstack-models.json")]])ok(!source.includes(legacy),"Legacy or conditional runtime symbol "+legacy+" in "+name);
if(errors.length){errors.forEach(e=>console.error("FAIL "+e));process.exit(1)}
console.log("template verification: ok");
