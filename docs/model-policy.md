# Model Policy

## Status

This document explains the current model portfolio and its rationale. It is descriptive. The executable sources of truth are `settings.json` and `pstack-models.json`; `models.json` defines the custom Command Code models and their supported thinking levels.

If this document and executable configuration diverge, the configuration controls runtime behavior and this document should be corrected.

## Portfolio

The current profile uses five models across two provider paths:

- `openai-codex/gpt-6-astra`
- `openai-codex/gpt-5.6-sol`
- `commandcode-goat/deepseek/deepseek-v4-flash`
- `commandcode-goat/z-ai/glm-5.3-flash`
- `commandcode-goat/Qwen/Qwen3.8-Flash`

The split is task-oriented rather than leaderboard-oriented.

| Function | Current model | Rationale |
| --- | --- | --- |
| Coordinate | GPT-6 Astra | parent decomposition, integration, and final judgment |
| Execute | GLM 5.3 Flash | normal bounded implementation and delegated engineering work |
| Read | DeepSeek V4 Flash | cache-heavy reconnaissance and compact evidence collection |
| Judge | Qwen 3.8 Flash | review, ambiguity detection, synthesis, and structured prose |
| Oracle | GPT-5.6 Sol | explicit bounded second opinion for unusually hard decisions |

`Qwen3.8-Flash` is the deployed model corresponding to Qwen3.8-Flash-Next in this portfolio.

## Current pstack assignments

`pstack-models.json` contains the authoritative selectors. At the current revision, the role families are arranged as follows:

- feature/refactoring, bug-fix, performance, hillclimb, investigation, and swarm execution use GLM 5.3 Flash;
- cache-heavy exploration and tooling reflection use DeepSeek V4 Flash;
- explanation, review, judgment, synthesis, and cross-judging use Qwen 3.8 Flash;
- the hardest-task and architecture panels may include GPT-6 Astra;
- GPT-5.6 Sol is reserved for the explicit `oracle` subagent rather than automatic pstack panels.

The exact thinking level belongs to the selector in `pstack-models.json`, not to this prose.

## Generic subagents

`settings.json` is authoritative for generic subagent defaults and named overrides. The current profile uses GLM as the generic delegated worker, DeepSeek for scout-style reading, Qwen for reviewer-style judgment, and Sol for the explicit oracle.

Read-only capability is enforced by tool configuration, not by asking those models to avoid writes.

## Why the portfolio is small

Each permanent model should own a materially different task shape. Adding another generalist increases routing ambiguity, maintenance, and fan-out cost without necessarily closing a capability gap.

A candidate should therefore replace an existing role owner or demonstrate an uncovered role. Evaluate candidates at the exact provider and thinking level proposed for production.

Useful role-specific measures include:

1. task success and usable-artifact rate;
2. evidence recall and unnecessary continuation for discovery roles;
3. false-premise and insufficient-evidence handling for judgment roles;
4. wall time, provider failures, and plan or credit cost;
5. behavior under the concurrency used by the real pstack workflow.

Synthetic benchmark rank alone is insufficient.

## Provider separation

GPT-6 Astra and GPT-5.6 Sol use `openai-codex`. The specialist Flash models use the repository-defined `commandcode-goat` provider.

Privacy enforcement belongs to `models.json`: Command Code requests include the literal ZDR header there. Model-routing prose is not part of that privacy boundary.

## Changing the portfolio

For a model-policy change:

1. change the executable assignment in `settings.json` and/or `pstack-models.json`;
2. change `models.json` only when the custom provider model catalog or thinking metadata changes;
3. update this rationale if the task ownership changes;
4. run `node scripts/verify-template.mjs`;
5. build and smoke the affected provider path when release qualification requires it.

No `AGENTS.md` update is required because model routing is not encoded in a global agent prompt.
