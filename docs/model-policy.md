# Model Policy

## Status

This document explains the current model portfolio and its rationale. It is descriptive. The executable sources of truth are `settings.json` and `pstack-models.json`; `models.json` defines the custom Command Code models and their supported thinking levels.

If this document and executable configuration diverge, the configuration controls runtime behavior and this document should be corrected.

## Portfolio

The current profile uses four models across two provider paths:

- `commandcode-goat/deepseek/deepseek-v4.1-flash`
- `commandcode-goat/z-ai/glm-5.3-flash`
- `commandcode-goat/Qwen/Qwen3.8-Flash`
- `openai-codex/gpt-6-astra`

The split is task-oriented rather than leaderboard-oriented.

| Function | Current model | Rationale |
| --- | --- | --- |
| Coordinate | GPT-6 Astra | low-effort parent orchestration after the task method and plan are established by pstack/Poteto |
| Execute | DeepSeek V4.1 Flash | fast, low-cost implementation, debugging, research, and delegated execution |
| Verify engineering work | GLM 5.3 Flash | independent code and plan review that is not correlated with the primary DeepSeek execution path |
| Judge and synthesize | Qwen 3.8 Flash | intent, prose, synthesis, ambiguity detection, and a second independent review family |
| Escalate | GPT-6 Astra | bounded `medium`-effort oracle calls and high-stakes panel participation |

The profile uses Command Code's explicit `deepseek/deepseek-v4.1-flash` model id rather than the older `deepseek/deepseek-v4-flash` latest alias or the retired beta id.

`Qwen3.8-Flash` is the deployed model corresponding to Qwen3.8-Flash-Next in this portfolio.

The interactive Pi parent uses GPT-6 Astra at `low`. This keeps orchestration capable but cheap when pstack/Poteto has already made the workflow and verification topology explicit. Normal implementation and delegated execution remain on DeepSeek. Pstack uses `max` only for task families that benefit from a deeper execution pass. GPT-6 Astra oracle and panel routes remain capped at `medium`.

## Current pstack assignments

`pstack-models.json` contains the authoritative selectors. At the current revision, the role families are arranged as follows:

- feature/refactoring uses DeepSeek at `high`;
- bug-fix, performance, and hillclimb execution use DeepSeek at `max`;
- exploration, investigation, and swarm execution use DeepSeek at `high`;
- tooling reflection and the primary engineering critic use GLM;
- explanation, judgment, prose, synthesis, and a second independent review family use Qwen;
- the hardest-task route uses GPT-6 Astra at `medium`;
- architecture and arena generation include all four families;
- cross-judge and interrogate pools exclude DeepSeek where they evaluate DeepSeek-led work, so review diversity is real rather than self-review by the same family.

The exact thinking level belongs to the selector in `pstack-models.json`, not to this prose.

## Generic subagents

`settings.json` is authoritative for generic subagent defaults and named overrides.

- `scout`: DeepSeek `low` for local reconnaissance.
- `researcher`: DeepSeek `high` for evidence collection.
- `worker`: DeepSeek `high` as the single normal writer.
- `reviewer`: GLM `high` for independent verification.
- `oracle`: GPT-6 Astra `medium` for bounded capability escalation.
- `poteto-agent`: DeepSeek `high` for delegated pstack execution.
- `comment-sicko`: Qwen `medium` for comment and prose judgment.

Pi-subagents 0.70.0 no longer supports same-launch `fallbackModels` or persistent model exclusions. Each generic role therefore has one configured model. Availability recovery requires a later explicit launch or a higher-level pstack workflow decision; completed or partially executing writer work is not replayed automatically on another model.

The 0.70.0 pin is deliberate. Pi-subagents 0.70.1 is newer, but its watchdog path has an open compatibility regression with stable Pi 0.86.1 (`nicobailon/pi-subagents#2377`). Keep 0.70.0 until that path is fixed upstream or a later release passes the Docker and delegated-review smoke.

The oracle is a fresh capability escalation that protects decision consistency. It is not a default executor and has no weaker alternate model configured that could silently change the meaning of an oracle call.

Tool capability is enforced by configuration, not by asking models to avoid unavailable operations. `researcher` intentionally has no local tool override, so the package-owned research surface, including `source_check`, is not shadowed. `worker` and `poteto-agent` inherit ambient tools. The narrower `scout`, `reviewer`, and `oracle` allowlists are version-checked by the static verifier. Their Pi-Lens diagnostics entry is `lens_diagnostics`; the retired `lsp_diagnostics` name is not configured. They also receive the current FFF `multi_grep`, Pi-Lens `project_report`, and dynamically loaded read-only structural search without receiving mutation-capable Pi-Lens tools.

## Command Code transport and privacy

GPT-6 Astra uses `openai-codex`. The Flash models use the repository-defined `commandcode-goat` provider.

The Command Code transport configuration lives in `models.json`. The default profile intentionally does not send `x-cmd-zdr`. Enforced ZDR can reject a model with `422 cmd_zdr_no_providers` when no ZDR-capable upstream is available, which conflicts with the goal of keeping DeepSeek and GLM usable.

Without enforced ZDR, this template does not guarantee zero retention. Command Code states that it does not train foundation models on prompts or source code and enables upstream no-training settings where available, while AI request content may be retained for up to 30 days and some upstream terms can differ. Treat these as provider policy, not as an invariant enforced by this repository.

DeepSeek is behind the Command Code proxy URL, so Pi cannot infer DeepSeek-specific OpenAI-completions compatibility from the provider id or URL. `models.json` therefore sets DeepSeek's `thinkingFormat` and assistant reasoning-history requirement explicitly at the model level.

## Why the portfolio is small

Each permanent model should own a materially different task shape. Adding another generalist increases routing ambiguity, maintenance, and fan-out cost without necessarily closing a capability gap.

A candidate should therefore replace an existing role owner or demonstrate an uncovered role. Prefer current provider documentation and public benchmark results that identify the exact model and reasoning-effort setting. Do not keep a weaker model only to increase the model count when existing panels already provide independent families.

## Changing the portfolio

For a model-policy change:

1. change the executable assignment in `settings.json` and/or `pstack-models.json`;
2. change `models.json` only when the custom provider catalog, transport behavior, or thinking metadata changes;
3. update this rationale if the task ownership changes;
4. run `node scripts/verify-template.mjs`;
5. build and smoke the affected provider path when release qualification requires it.

No `AGENTS.md` update is required because model routing is not encoded in a global agent prompt.
