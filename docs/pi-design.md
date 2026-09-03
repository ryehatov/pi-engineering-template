# Pi Engineering Design

## System shape

The template is a three-layer engineering core with a narrow model runtime.

```text
Human
  |
  v
Pi parent (Luna by default)
  |
  +-- pstack: method, playbooks, principles, review topology
  |
  +-- pi-subagents: child lifecycle, isolation, worktrees, budgets
          |
          +-- GLM 5.3 Flash: discover
          +-- DeepSeek V4 Flash: execute
          +-- Qwen 3.8 Flash: judge
          +-- Luna: integrate
          +-- Sol: escalate
```

Pi is the only parent runtime. Pstack decides *how engineering should proceed*. Pi-subagents decides *how delegated work is executed*. Models are workers with explicit roles, not additional workflow layers.

Supporting extensions supply capabilities such as structural search, diagnostics, web access, debugging, context inspection, and UI. They are intentionally below the workflow boundary.

## Why the old provider model was replaced

The previous branch routed specialist models through OpenCode Go and relied on a broad provider catalog. That shape did not encode the current privacy or task-specialization policy strongly enough.

The new design removes OpenCode Go entirely. Command Code uses the official GOAT Provider API through Pi's native OpenAI-compatible provider support. The provider is static and repository-owned:

```text
commandcode-goat
  base: https://api.commandcode.ai/provider/v1
  api: openai-completions
  auth: COMMAND_CODE_API_KEY at runtime
  privacy: x-cmd-zdr: 1 on every request
  models: exactly three reviewed specialists
```

No Command Code extension is needed in the runtime. This avoids dynamic provider registration, transport auto-detection, generic model discovery, and a second source of model metadata. It also makes ZDR a committed request invariant instead of an optional environment toggle.

`CMD_ZDR=1` remains set in the image as defense in depth. The literal provider header is the authoritative enforcement for Pi requests.

## Why the portfolio is small

The portfolio is organized around failure modes.

- GLM finds relevant evidence but can over-search.
- DeepSeek finishes scoped work but should not own final taste or policy judgment.
- Qwen judges well and can say the evidence is insufficient, but it is not the default autonomous implementer.
- Luna integrates broad work and keeps the parent coherent.
- Sol handles the expensive tail of difficult reasoning.

These roles are complementary. Adding another generalist that overlaps all five increases routing ambiguity, fan-out cost, and maintenance without closing a real capability gap.

## Pstack as policy

Poteto Mode is the engineering policy for nontrivial work. The repository does not add another mandatory develop-plan-review loop.

The committed pstack profile is stronger than the generic `/setup-pstack` default in two ways:

1. Every pstack role is explicit. Reproducibility does not depend on the current parent model except where a package agent intentionally uses `model: inherit`.
2. Thinking is encoded in each pstack model selector. The role therefore selects the model *and* the reasoning budget.

The parent still owns the final decision. Multi-model panels are evidence, not votes that automatically bind the parent.

## Delegation topology

The normal topology is two levels deep:

```text
parent Pi
  -> poteto-agent or direct pstack workflow
      -> worker/reviewer panel
```

`maxSubagentDepth` is therefore `2`. More depth is not part of the default design.

The generic child default is DeepSeek V4 Flash at `high`, because an unspecified delegation is usually asking for bounded work to be completed. Named builtin roles override this:

- scout -> GLM 5.3 Flash `low`
- researcher -> GLM 5.3 Flash `high`
- reviewer -> Qwen 3.8 Flash `medium`
- oracle -> GPT-5.6 Sol `max`
- poteto-agent -> inherit the parent model at `high`
- comment-sicko -> Qwen 3.8 Flash `medium`

Pstack per-run model selectors take precedence over these generic defaults.

## Tool boundaries

Worker and Poteto agents inherit ambient tools because implementation tasks may need repository-specific extensions.

Scout receives read/search tools plus its output write path and Lens inspection tools. Reviewer and Oracle remain source-read-only. Researcher keeps its package-defined web research tool set so it can write its isolated research artifact without inheriting arbitrary mutation tools.

Pstack workflows that request read-only children further narrow tools at launch. The most specific launch contract wins.

## Parallelism and provider pressure

Parallelism is a means to increase evidence diversity or throughput, not a goal by itself.

The template bounds a workflow to 32 child spawns, 8 globally active children, and 4 concurrent tasks in an ordinary parallel batch. This is enough for pstack's 2-4-way explorers and three-model panels without creating a large homogeneous request burst against one provider.

The model-exclusion TTL is reduced to five minutes. A transient provider or rate-limit failure should not poison a small curated model portfolio for a full day.

Use worktree isolation for parallel writers. If tasks would modify overlapping state, separate ownership before trying to serialize access.

## Context discipline

Delegated context defaults to `fresh`. The parent should pass the smallest durable packet that makes the child autonomous: task, relevant paths, constraints, acceptance criteria, and artifacts.

This preserves the parent's context for integration and avoids copying a large transcript into every fan-out child. Pstack's `how`, `why`, arena, and reflect workflows already define when broader context must be materialized.

## Verification layers

Verification is layered by failure class.

1. `scripts/verify-template.mjs` proves repository configuration invariants without credentials or network access.
2. Docker build proves the package pins install together.
3. A live Pi smoke proves authentication, model registry resolution, thinking translation, and ZDR-capable Command Code routing.
4. Project-specific tests prove the artifact being engineered.

No static check can prove live provider availability. No live model call can replace deterministic configuration validation. Both layers have distinct jobs.
