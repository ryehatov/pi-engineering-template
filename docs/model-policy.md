# Model Policy

## Purpose

The model portfolio is a routing policy, not a leaderboard. Each permanent model must own a distinct task shape that justifies its operational and cognitive cost.

The profile has five models across two provider paths:

- `openai-codex/gpt-5.6-luna`
- `openai-codex/gpt-5.6-sol`
- `commandcode-goat/deepseek/deepseek-v4-flash`
- `commandcode-goat/z-ai/glm-5.3-flash`
- `commandcode-goat/Qwen/Qwen3.8-Flash`

No other model is in the strict subagent allowlist.

## Task archetypes

### Find: GLM 5.3 Flash

GLM owns evidence acquisition. Use it when success is mostly finding the relevant file, call edge, dependency, historical fact, or missing piece of context.

Strength: high information-retrieval yield.

Failure mode: continuing to investigate after enough evidence exists.

Mitigation: prompts must state the target evidence, the stopping condition, and the expected compact handoff. Pstack `how explorer` and `why investigators` are natural fits.

### Finish: DeepSeek V4 Flash

DeepSeek owns bounded execution. Use it when the task has a clear target and the main risk is failure to carry the work through to a useful artifact.

Strength: turning a scoped task into completed work.

Failure mode: rougher judgment or local choices than a top-tier integrator.

Mitigation: give it explicit acceptance criteria and make the parent or a reviewer own integration judgment. It is the default generic subagent, swarm worker, hillclimber, and tooling reflector.

### Judge: Qwen 3.8 Flash

Qwen owns disciplined judgment. Use it for review, compliance with a rubric, detecting insufficient evidence, and resisting a false premise.

Strength: instruction adherence, low hallucination pressure, and willingness to return an indeterminate verdict.

Failure mode: not the preferred model for broad autonomous implementation.

Mitigation: keep it read-only in reviewer roles and give it explicit criteria. It is the default reviewer and the first cross-judge candidate.

The external benchmark report that motivated this assignment refers to Qwen3.8 Flash Next. Command Code currently exposes `Qwen/Qwen3.8-Flash`; this profile treats the deployed Flash model as the operational target and relies on live evaluation rather than assuming naming alone proves equivalence.

### Coordinate: GPT-5.6 Luna

Luna owns the ordinary parent session and coherent integration. It is used where broad coding competence and cross-boundary synthesis matter more than a specialist's narrow advantage.

Use it for normal feature/refactor shaping, explanation, and general candidate generation. The parent runs at `max` because its job is to decompose, integrate, and judge the work of cheaper children rather than repeat their bulk exploration.

### Escalate: GPT-5.6 Sol

Sol owns the rare high-value path: hardest tasks, root-cause-heavy defects, architecture, synthesis, and final high-stakes judgment.

`high` is the normal deep-work setting. `max` is reserved for bounded synthesis, architecture, and the hardest tasks. Sol is deliberately not the default worker or default reviewer.

## Pstack role matrix

`pstack-models.json` is the executable policy.

| Pstack role | Assignment | Reason |
| --- | --- | --- |
| feature, refactoring | Luna `high` | coherent multi-file implementation without making `max` routine |
| bug-fix | Sol `high` | root-cause reasoning without spending `max` by default |
| perf-issue | Sol `high` | measurement interpretation and causal reasoning |
| hillclimb | DeepSeek `high` | repeated bounded experiment loops and completion |
| judgment and prose | Qwen `xhigh` | rule-following and explicit judgment |
| hardest tasks | Sol `max` | explicit escalation path |
| how explorer | GLM `high` | codebase discovery |
| how explainer | Luna `high` | stop exploring and produce a coherent mental model |
| how critics | Qwen `xhigh`, Sol `high`, GLM `high` | judgment, depth, and evidence-finding diversity |
| why investigators | GLM `high` | evidence acquisition |
| why synthesizer | Sol `max` | reconcile evidence and uncertainty |
| reflect tooling | DeepSeek `max` | convert a lesson into a concrete mechanism |
| reflect judgment/divergent/synthesizer | Sol `max` | upstream pstack 0.4.0 combines these roles; synthesis quality wins |
| arena runners | Luna `high`, DeepSeek `max`, GLM `max` | integrator, executor, and explorer generate different candidates |
| arena cross-judge pool | Qwen `xhigh`, Sol `high` | independent rubric judgment with escalation backup |
| swarm workers | DeepSeek `high` | high-throughput bounded completion |
| architect runners | Sol `max`, Luna `max`, Qwen `xhigh` | deep architecture, integration, disciplined alternative |
| interrogate reviewers | Qwen `xhigh`, Sol `high`, GLM `high` | judgment, depth, and evidence search |

Panel size is normally three. Three distinct reasoning profiles provide useful 2-of-3 agreement while avoiding the cost of a fourth permanent panel member. Cross-judge pools are smaller because only one judge is launched.

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

GPT-5.6 Luna and Sol use `openai-codex` only.

The three specialist Flash models use `commandcode-goat` only. That provider is defined in `models.json` with the official Provider API, `openai-completions`, runtime API-key resolution, and a literal `x-cmd-zdr: 1` header.

Do not install a Command Code provider extension to add model discovery. Runtime discovery expands policy surface and introduces extension registration lifecycle dependencies. The template instead pins the small model set it has actually reviewed.

## Adding or replacing a model

A new model does not enter because it is newer or scores higher globally. It must displace an existing owner or fill a real uncovered role.

Evaluate it on the task shape it would own:

1. Use representative repository tasks, not synthetic chat prompts only.
2. Measure success rate, usable-output rate, wall time, model/credit cost, and unnecessary continuation.
3. Compare at the exact thinking level proposed for production.
4. Include failure-mode tasks: insufficient evidence, false premises, ambiguous requirements, and a task that requires stopping rather than continuing to explore.
5. Run a small fan-out test because concurrency behavior and provider limits matter to pstack.
6. If it wins, replace the previous role owner in `models.json`, `settings.json`, and `pstack-models.json` in one change.
7. Update the verifier and this document in the same commit.

Do not keep both models merely to avoid making a decision.
