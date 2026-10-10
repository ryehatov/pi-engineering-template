#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const packageDir = process.argv[2];
if (!packageDir) throw new Error("Pass the installed pi-pstack package directory");

const patches = {
  "skills/how/SKILL.md": [
    ["- agent: \"worker\"", "- agent: \"how-analyst\"", 3],
    ["- tools: read-only (`read, grep, find, ls, bash`)", "- tools: the `how-analyst` profile enforces read-only access; do not pass per-call tools", 3],
  ],
  "skills/interrogate/SKILL.md": [
    ["Launch all reviewers in a single message using the Task tool.", "Use `subagent()` with `agent: \"reviewer\"` for native selectors. For a selector starting `claude-code/`, use `agent: \"claude-code\"`, strip that prefix from `model` and preserve the thinking suffix (e.g. `claude-opus-5-5:high`). Run asynchronously. The read-only Claude Code CLI adapter has NO tools: inline the full diff, relevant source, rubric and test evidence in each `task`, not only file paths. A failed independent review must be reported, never silently replaced by OpenAI."],
    ["- agent: \"worker\"", "- agent: \"reviewer\" (native model) or \"claude-code\" (selector starting `claude-code/`)"],
    ["- tools: read-only (`read, grep, find, ls, bash`)", "- Do not pass per-call tools. The native reviewer has its package-defined tool surface; the Claude Code CLI reviewer is no-tools and needs inlined evidence."],
    ["If a model slug is rejected as unresolvable when you try to spawn the subagent, check the valid slugs in the Task tool\u0027s error message, pick the closest equivalent (prefer the highest-reasoning tier of the same family), spawn with the valid slug, and open a separate PR to update the configured value or default table. Do not block the review on the slug issue. If the configured value is `inherit-parent` or `auto`, omit `model` instead. Never treat those aliases as broken slugs or enter this fallback for them.", "If the configured model cannot be resolved or the Claude Code adapter cannot start, record the missing independent review and the exact error. Do not silently substitute or guess a different reviewer model. The `inherit-parent` and `auto` selectors omit `model`."],
  ],
  "skills/arena/SKILL.md": [
    ["Spawn one readonly judge subagent on that model.", "Spawn a judge with `subagent()` and `async: true`. For a `claude-code/` selector choose `agent: \"claude-code\"` and strip this prefix from `model` (keep the effort suffix); inline the complete rubric, candidate contents and test evidence because the CLI adapter has no filesystem tools. For a native selector choose `agent: \"reviewer\"` with its normal tools. Never silently replace a failed independent judge with a same-provider one."],
    ["`run_in_background: true`", "`async: true`"],
  ],
  "skills/swarm/SKILL.md": [
    ["parallel cloud workers", "parallel Pi workers"],
    ["not the cloud concurrency limit", "not the configured concurrency limit"],
    ["Spawn all N workers in one message with `agent: \"worker\", `environment: \"cloud\"`, `run_in_background: true`, and the configured model. Use `environment: \"local\"` only when the worker needs access to something on the user's computer.", "Spawn N `subagent()` workers with `agent: \"worker\"`, `async: true`, and the configured model. Use separate worktrees for parallel writers."],
    ["When a worker must start from a non-default pushed branch, pass `cloud_base_branch`.", "When a worker must start from another branch, pass its named ref as `baseRef` with worktree isolation."],
  ],
  "skills/poteto-mode/SKILL.md": [
    ["`run_in_background: true`", "`async: true`"],
    ["omit Task `model`", "omit `model`"],
    ["A standing project-scale program (multi-day, many stacked PRs, a fleet of subagents under one coordinator) routes to **Orchestrate** instead. figure-it-out designs one bespoke run, orchestrate runs the program.", "A standing project-scale program uses bounded Pi subagent workflows and `/goal` continuation."],
    ["- **Orchestrate.** A standing project handed to one coordinator chat: multi-day, many stacked PRs, dozens to hundreds of subagents, minimal human turns (\"run this whole project\", \"own this migration until it lands\"). Distinct from Autonomous run, which drives one task to a predicate. Work one agent could finish inside the session's budget routes there, not here, however program-shaped the phrasing sounds. `playbooks/orchestrate.md`.\n", ""],
    ["- **Autopilot-full.** A queue of independent PRs run to merged with full autonomy. One owner per PR carries build through merge, and the root swarm-verifies each merge-ready head before its owner merges (\"autopilot this queue\", \"full autopilot\", one-owner-per-PR programs). `playbooks/autopilot-full.md`.\n", ""],
    ["- **Autopilot-stack.** A queue of changes built and verified with full autonomy, delivered as one linear reviewed base-branch stack the operator lands herself (\"autopilot-stack\", \"stack them, don't ship\", \"build the stack, I'll land it\"). `playbooks/autopilot-stack.md`.\n", ""],
  ],
  "skills/reflect/SKILL.md": [
    ["agent mode (`readonly: false`). Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript). Readonly strips MCPs.", "The worker profile supplies available MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript). Do not pass an unsupported per-call `readonly` flag."],
    ["agent mode (`readonly: false`). The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Readonly strips MCPs.", "The worker profile supplies available MCP access for spot-verifying citations. Do not pass an unsupported per-call `readonly` flag."],
  ],
  "skills/why/SKILL.md": [
    ["- `readonly`: `false` (agent mode). **Do not use readonly/Ask mode.** It strips MCP access, which disables MCP-backed investigators entirely. Investigators still shouldn't write anything.", "- The worker profile supplies available MCP access. Do not pass an unsupported per-call `readonly` flag. Investigators must not write anything."],
    ["- `readonly`: `false` (agent mode). The synthesizer's quality check spot-verifies citations, which can require MCP access. Readonly/Ask mode strips MCPs and defeats that.", "- The worker profile supplies available MCP access to spot-verify citations. Do not pass an unsupported per-call `readonly` flag."],
  ],
  "skills/poteto-mode/playbooks/autonomous-run.md": [
    ["Pick the wake mechanism using a recurring wake (a built-in, not a pstack skill). An event to watch (CI, a merge, a ref advancing) gets a watcher subagent that wakes you on the event, with a long time-based heartbeat as fallback. No event gets a fixed-interval heartbeat sized to when the result is worth re-checking.", "Use `/goal` for bounded continuation. For an external event, start a watcher subagent and call `goal_wait` with a long fallback deadline; its completion wakes the Goal. Do not add a second loop controller."],
  ],
};

for (const [file, replacements] of Object.entries(patches)) {
  const target = path.join(packageDir, file);
  let source = fs.readFileSync(target, "utf8");
  for (const [before, after, expected = 1] of replacements) {
    if (source.split(before).length - 1 !== expected) throw new Error(`Unexpected pi-pstack content: ${file}`);
    source = source.replaceAll(before, after);
  }
  fs.writeFileSync(target, source);
}
