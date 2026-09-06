# Model Policy

## Purpose

The model portfolio is a routing policy, not a leaderboard. Each permanent model must own a distinct task shape that justifies its operational and cognitive cost.

The profile has five models across two provider paths:

- `openai-codex/gpt-6-astra`
- `openai-codex/gpt-5.6-sol`
- `commandcode-goat/deepseek/deepseek-v4-flash`
- `commandcode-goat/z-ai/glm-5.3-flash`
- `commandcode-goat/Qwen/Qwen3.8-Flash`

No other model is in the strict subagent allowlist. GPT-5.6 Luna is intentionally absent: the OpenAI-Codex budget is reserved for Astra orchestration and explicit Sol oracle calls, while normal delegated work uses Command Code.

## Task archetypes

### Read: DeepSeek V4 Flash

DeepSeek owns cache-heavy, low-output inspection. Use it for repeated repository reads, reconnaissance, and compact evidence gathering when prompt-cache reuse is expected to dominate.

Its unusually low cache-read price is the reason it remains in the portfolio. It is not the generic cheap worker: fresh input and generated output usually favor GLM for normal engineering work.

Keep reader roles source-read-only by default. Parent-context reduction comes from fresh child contexts and compact handoff; prompt caching lowers provider cost but does not remove cached tokens from the child context.

### Execute: GLM 5.3 Flash

GLM owns the normal delegated workload. Use it for feature and refactor implementation, bug and performance fixes after framing, research, hillclimbs, swarms, and other bounded autonomous execution.

It is the default generic subagent and worker. `high` is the normal level; `max` is used only for bounded high-value panel candidates.

### Judge: Qwen 3.8 Flash

Qwen owns disciplined judgment, review, explanation, and synthesis. Use it for policy adherence, ambiguity detection, evidence-quality decisions, cross-judging, and structured prose.

`Qwen3.8-Flash` is the production model corresponding to Qwen3.8-Flash-Next for this portfolio. The configured Command Code model ID is `Qwen/Qwen3.8-Flash`.

Use `medium` for normal review or side questions and `xhigh` for explicit judgment or synthesis roles.

### Coordinate: GPT-6 Astra

Astra owns the interactive parent session. The default is `low` because this workflow hardens requirements before implementation through grilling or an equivalent specification pass. The parent should therefore spend its effort on decomposition, routing, integration, and final judgment rather than rediscovering intent or performing bulk reads.

Delegate repetitive inspection and implementation. Escalate Astra only for a concrete high-value decision or for the pstack `hardest tasks` role, which uses `high`.

### Oracle: GPT-5.6 Sol

Sol owns one narrow role: explicit bounded second opinion. It stays at `max` in the `oracle` subagent and is intentionally absent from automatic pstack panels.

This preserves model-family and reasoning diversity without spending OpenAI-Codex quota on ordinary feature, bug, architecture-panel, or review work. If local evaluation later shows Astra escalation dominates Sol oracle work on quality per quota, remove Sol rather than adding another tier.

## Pstack role matrix

`pstack-models.json` is the executable policy.

| Pstack role | Assignment | Reason |
| --- | --- | --- |
| feature, refactoring | GLM `high` | normal bounded implementation |
| bug-fix | GLM `high` | implement after reproduction/root-cause framing |
| perf-issue | GLM `high` | implement after measurement and causal framing |
| hillclimb | GLM `high` | repeated bounded experiment loops |
| judgment and prose | Qwen `xhigh` | explicit judgment and structured prose |
| hardest tasks | Astra `high` | frontier escalation for genuinely hard work |
| how explorer | DeepSeek `high` | cache-heavy read-only exploration |
| how explainer | Qwen `medium` | turn evidence into a coherent mental model |
| how critics | Qwen `xhigh`, GLM `max`, DeepSeek `high` | judgment, strong alternative, reader diversity |
| why investigators | GLM `high` | broad evidence acquisition across sources |
| why synthesizer | Qwen `xhigh` | confidence-weighted synthesis |
| reflect tooling | DeepSeek `high` | inspect repeated/tooling evidence cheaply |
| reflect judgment/divergent/synthesizer | Qwen `xhigh` | judgment and synthesis |
| arena runners | GLM `max`, Qwen `xhigh`, DeepSeek `high` | executor, judge, and reader diversity |
| arena cross-judge pool | Qwen `xhigh`, GLM `max` | independent rubric judgment without OpenAI quota |
| swarm workers | GLM `high` | high-throughput bounded execution |
| architect runners | Astra `high`, GLM `max`, Qwen `xhigh` | frontier coordination plus independent alternatives |
| interrogate reviewers | Qwen `xhigh`, GLM `max`, DeepSeek `high` | judgment, implementation depth, evidence search |

Panel size remains three. Three distinct reasoning profiles provide useful agreement while keeping fan-out bounded. Sol is not a panel member; use the explicit `oracle` only when the parent decides a separate deep second opinion is justified.

## Subagent routing

`settings.json` uses the same responsibility split:

- generic subagent and `worker`: GLM `high`
- `researcher`: GLM `high`
- `scout`: DeepSeek `high`, source-read-only
- `reviewer`: Qwen `medium`, source-read-only
- `oracle`: Sol `max`, source-read-only
- `poteto-agent`: GLM `high`, with nested subagents enabled
- `comment-sicko`: Qwen `medium`

The parent is Astra `low`. `pi-btw` uses Qwen `medium` so side questions do not consume the OpenAI-Codex budget by default.

## Thinking policy

Thinking is part of the role assignment. The pstack selectors therefore use Pi's `provider/model:thinking` form.

Supported Command Code levels in this profile are intentionally encoded in `models.json`:

| Model | Allowed levels |
| --- | --- |
| DeepSeek V4 Flash | `high`, `max` |
| GLM 5.3 Flash | `low`, `high`, `max` |
| Qwen 3.8 Flash | `low`, `medium`, `xhigh` |

The verifier rejects a pstack selector that requests an unsupported level.

## Provider policy

GPT-6 Astra and GPT-5.6 Sol use `openai-codex` only.

The three specialist Flash models use `commandcode-goat` only. That provider is defined in `models.json` with the Provider API, `openai-completions`, runtime API-key resolution, and a literal `x-cmd-zdr: 1` header.

Do not install a Command Code provider extension to add model discovery. Runtime discovery expands policy surface and introduces extension-registration lifecycle dependencies. The template pins the small model set it has reviewed.

## Adding or replacing a model

A new model does not enter because it is newer or scores higher globally. It must displace an existing owner or fill a real uncovered role.

Evaluate it on the task shape it would own:

1. Use representative repository tasks, not synthetic chat prompts only.
2. Measure success rate, usable-output rate, wall time, model or credit cost, cache-hit ratio where relevant, and unnecessary continuation.
3. Compare at the exact thinking level proposed for production.
4. Include failure-mode tasks: insufficient evidence, false premises, ambiguous requirements, and a task that requires stopping rather than continuing to explore.
5. Run a small fan-out test because concurrency behavior and provider limits matter to pstack.
6. If it wins, replace the previous role owner in `settings.json` and `pstack-models.json`; change `models.json` only when the Command Code model set itself changes.
7. Update the verifier and this document in the same commit.

Do not keep both models merely to avoid making a decision.
