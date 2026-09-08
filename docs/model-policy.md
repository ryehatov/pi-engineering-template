# Model Policy

## Status

This document explains the current model portfolio and its rationale. It is descriptive. The executable sources of truth are `settings.json` and `pstack-models.json`; `models.json` defines the custom Command Code models and their supported thinking levels.

If this document and executable configuration diverge, the configuration controls runtime behavior and this document should be corrected.

## Portfolio

The current profile uses four models across two provider paths:

- `openai-codex/gpt-6-astra`
- `commandcode-goat/deepseek/deepseek-v4.1-flash-beta`
- `commandcode-goat/z-ai/glm-5.3-flash`
- `commandcode-goat/Qwen/Qwen3.8-Flash`

The split is task-oriented rather than leaderboard-oriented.

| Function | Current model | Rationale |
| --- | --- | --- |
| Coordinate and escalate | GPT-6 Astra | low-effort parent decomposition and integration; high-effort bounded reasoning for the hardest tasks and explicit oracle calls |
| Execute | GLM 5.3 Flash | normal bounded implementation, debugging, tooling analysis, and delegated engineering work |
| Read and investigate | DeepSeek V4.1 Flash Beta | cache-heavy reconnaissance, research, evidence collection, and divergent exploration |
| Judge | Qwen 3.8 Flash | review, ambiguity detection, synthesis, and structured prose |

`Qwen3.8-Flash` is the deployed model corresponding to Qwen3.8-Flash-Next in this portfolio.

GPT-6 Astra is deliberately not routed above `high`. Public Artificial Analysis comparisons at this revision show only small Intelligence Index gains from `high` to `xhigh` and `max`, while first-token latency rises sharply. The profile therefore treats `high` as the cost-performance ceiling for bounded Astra escalation and keeps the interactive parent at `low`.

## Current pstack assignments

`pstack-models.json` contains the authoritative selectors. At the current revision, the role families are arranged as follows:

- feature/refactoring, bug-fix, performance, hillclimb, tooling reflection, and swarm execution use GLM 5.3 Flash;
- code exploration, evidence-heavy investigation, and research use DeepSeek V4.1 Flash Beta;
- explanation, review, judgment, synthesis, and cross-judging use Qwen 3.8 Flash;
- the hardest-task route uses GPT-6 Astra at `high`;
- architecture, arena, and adversarial-review panels use the three specialist model families, while the Astra parent performs final integration.

The exact thinking level belongs to the selector in `pstack-models.json`, not to this prose.

## Generic subagents

`settings.json` is authoritative for generic subagent defaults and named overrides. The current profile uses GLM as the generic delegated worker, DeepSeek V4.1 Flash Beta for scouting and research, Qwen for reviewer-style judgment, and Astra at `high` for the explicit oracle.

The oracle is a fresh-context capability escalation, not a separate model-family diversity mechanism. Multi-model diversity belongs to pstack panels.

Read-only capability is enforced by tool configuration, not by asking those models to avoid writes.

## Why the portfolio is small

Each permanent model should own a materially different task shape. Adding another generalist increases routing ambiguity, maintenance, and fan-out cost without necessarily closing a capability gap.

A candidate should therefore replace an existing role owner or demonstrate an uncovered role. Prefer current provider documentation and public benchmark results that identify the exact model and reasoning-effort setting. Do not keep a weaker model only to increase the model count when existing panels already provide independent families.

## Provider separation

GPT-6 Astra uses `openai-codex`. The specialist Flash models use the repository-defined `commandcode-goat` provider.

The Command Code transport configuration lives in `models.json`. Model-routing prose is not part of that transport boundary.

## Changing the portfolio

For a model-policy change:

1. change the executable assignment in `settings.json` and/or `pstack-models.json`;
2. change `models.json` only when the custom provider catalog or thinking metadata changes;
3. update this rationale if the task ownership changes;
4. run `node scripts/verify-template.mjs`;
5. build and smoke the affected provider path when release qualification requires it.

No `AGENTS.md` update is required because model routing is not encoded in a global agent prompt.
