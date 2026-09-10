# Model Policy

## Status

This document explains the current model portfolio and its rationale. It is descriptive. The executable sources of truth are `settings.json` and `pstack-models.json`; `models.json` defines the custom Command Code models and their supported thinking levels.

If this document and executable configuration diverge, the configuration controls runtime behavior and this document should be corrected.

## Portfolio

The current profile uses four models across two provider paths:

- `commandcode-goat/deepseek/deepseek-v4-flash`
- `commandcode-goat/z-ai/glm-5.3-flash`
- `commandcode-goat/Qwen/Qwen3.8-Flash`
- `openai-codex/gpt-6-astra`

The split is task-oriented rather than leaderboard-oriented.

| Function | Current model | Rationale |
| --- | --- | --- |
| Coordinate and execute | DeepSeek V4 Flash (latest) | fast, low-cost parent coordination plus normal implementation, debugging, research, and delegated execution |
| Verify engineering work | GLM 5.3 Flash | independent code and plan review that is not correlated with the primary DeepSeek execution path |
| Judge and synthesize | Qwen 3.8 Flash | intent, prose, synthesis, ambiguity detection, and a second independent review family |
| Escalate | GPT-6 Astra | bounded `medium`-effort oracle calls and high-stakes panel participation |

`deepseek/deepseek-v4-flash` is Command Code's stable latest-model route. At this revision it serves DeepSeek V4.1 Flash. The template uses the stable route instead of the retired V4.1 beta model id.

`Qwen3.8-Flash` is the deployed model corresponding to Qwen3.8-Flash-Next in this portfolio.

The interactive Pi parent uses DeepSeek at `high`. DeepSeek documents `low` for simple work, `high` for normal agent work, and `max` for complex work. Pstack therefore uses `max` only for task families that benefit from a deeper execution pass. GPT-6 Astra remains capped at `medium` and is not the normal parent or worker.

## Current pstack assignments

`pstack-models.json` contains the authoritative selectors. At the current revision, the role families are arranged as follows:

- feature/refactoring uses DeepSeek at `high`;
- bug-fix, performance, and hillclimb execution use DeepSeek at `max`;
- exploration, investigation, and swarm execution use DeepSeek at `high`;
- tooling reflection and the primary engineering critic use GLM;
- explanation, judgment, prose, synthesis, and a second critic use Qwen;
- the hardest-task route uses GPT-6 Astra at `medium`;
- architecture and arena generation include all four families;
- critic and cross-judge pools exclude DeepSeek when they evaluate DeepSeek-led work, so review diversity is real rather than self-review by the same family.

The exact thinking level belongs to the selector in `pstack-models.json`, not to this prose.

## Generic subagents

`settings.json` is authoritative for generic subagent defaults and named overrides.

- `scout`: DeepSeek `low` for local reconnaissance; GLM `low` is the startup fallback.
- `researcher`: DeepSeek `high` for evidence collection; GLM `high` is the startup fallback.
- `worker`: DeepSeek `high` as the single normal writer; GLM `high` is the startup fallback.
- `reviewer`: GLM `high` for independent verification; Qwen `xhigh` is the startup fallback.
- `oracle`: GPT-6 Astra `medium` with no semantic downgrade fallback.
- `poteto-agent`: DeepSeek `high` for delegated pstack execution.
- `comment-sicko`: Qwen `medium` for comment and prose judgment.

Pi-subagents fallback models are only availability recovery. Retryable provider/model failures can select a fallback before tool activity. The normal writer is not replayed on another model after it has already changed files.

The oracle is a fresh capability escalation that protects decision consistency. It is not a default executor and has no weaker fallback that could silently change the meaning of an oracle call.

Read-only capability is enforced by tool configuration, not by asking those models to avoid writes.

## Provider and data boundary

GPT-6 Astra uses `openai-codex`. The Flash models use the repository-defined `commandcode-goat` provider.

The Command Code transport configuration lives in `models.json`. It sends `x-cmd-zdr: 1`, so Command Code must use a zero-data-retention route or fail the request instead of silently selecting a non-ZDR upstream.

## Why the portfolio is small

Each permanent model should own a materially different task shape. Adding another generalist increases routing ambiguity, maintenance, and fan-out cost without necessarily closing a capability gap.

A candidate should therefore replace an existing role owner or demonstrate an uncovered role. Prefer current provider documentation and public benchmark results that identify the exact model and reasoning-effort setting. Do not keep a weaker model only to increase the model count when existing panels already provide independent families.

## Changing the portfolio

For a model-policy change:

1. change the executable assignment in `settings.json` and/or `pstack-models.json`;
2. change `models.json` only when the custom provider catalog, transport policy, or thinking metadata changes;
3. update this rationale if the task ownership changes;
4. run `node scripts/verify-template.mjs`;
5. build and smoke the affected provider path when release qualification requires it.

No `AGENTS.md` update is required because model routing is not encoded in a global agent prompt.
