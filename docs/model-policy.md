# Model Policy

`settings.json` controls the parent and generic agents; `pstack-models.json` supplies pstack's role hints. Pi-subagents' strict `modelScope` is the executable boundary. The pstack role table is injected into the parent prompt, so the parent must still choose the indicated model and check the resulting work.

## Assignment

| Work | Route | Reason |
| --- | --- | --- |
| Parent coordination | Codex GPT-6 Astra `high` | Resolve design and verification choices with the available Pro allowance. |
| Routine implementation and Poteto workers | Codex GPT-6 Luna `max` | Reliable tool use and faithful execution; the Codex Pro subscription is already available. |
| Reconnaissance and research | Codex GPT-6 Luna `low` / `high` | Spend less reasoning on scans; reserve deeper effort for evidence gathering. |
| Hardest decisions and oracle | Codex GPT-6 Astra `xhigh` | Explicit escalation instead of using the strongest effort on every child. |
| Ordinary independent review | GOAT GLM-5.3 Flash `high` | A separate model family and provider path at a low token rate. |
| Additional adversarial review | GOAT MiMo V2.6 Pro | A different family for pstack cross-judge and interrogate panels; review output is evidence for the parent, never the sole release gate. |
| Prose and a third review perspective | GOAT Qwen 3.8 Flash `medium` / `xhigh` | Separate synthesis and ambiguity checks. |

Pstack's arena *runners* use Luna, GLM, and Astra; its cross-judge pool uses Qwen and MiMo, outside every arena runner's model family. Architect runners also include Qwen. Interrogate reviewers use GLM, Qwen, and MiMo. When any reviewer also authored work, the parent must exclude that candidate from judging its own work. MiMo appears only in review selectors and is excluded from generic writers because [multi-turn tool-loop reports](https://github.com/XiaomiMiMo/MiMo/issues/98) warrant a bounded, read-oriented trial before autonomous implementation.

The generic `worker` and `poteto-agent` have additional model scopes that exclude MiMo even if a per-run override requests it. MiMo's Command Code ID is `xiaomi/mimo-v2.6-pro`. No supported numeric effort map is published for this transport. Its selectors omit `:thinking`, and the model-level `supportsReasoningEffort: false` prevents Pi from transmitting an unsupported `reasoning_effort` value. Its configured output cap is 32,768.

## Cost and availability

GOAT's published rates, in USD per million tokens, are useful for comparing routes. The `cost` fields in `models.json` let Pi estimate child spend; `cacheWrite` uses the uncached input rate as a conservative estimate where Command Code publishes no separate write rate. Subscription credit allowances and real usage are determined by Command Code, not these estimates.

| GOAT model | Input | Output | Cache read | Use here |
| --- | ---: | ---: | ---: | --- |
| GLM-5.3 Flash | 0.15 | 0.50 | 0.03 | Default review |
| MiMo V2.6 Pro | 0.435 | 0.87 | 0.0036 | Selected second review |
| Qwen 3.8 Flash | 0.16 | 0.47 | 0.016 | Prose and diverse judgment |

Rates and model IDs: [Command Code model catalog](https://commandcode.ai/models) and [GOAT plan](https://commandcode.ai/docs/plans/goat). GOAT's model-specific credit allowances differ; do not equate a displayed Pi dollar estimate with an incremental invoice or assume that the same subscription budget stretches equally across models. Codex models use the existing $200 Pro plan; the [Pi Codex catalog](https://pi.dev/models/openai-codex/gpt-6-luna) reports a 272,000-token window for Luna and [Astra](https://pi.dev/models/openai-codex/gpt-6-astra). Pro usage is bounded by plan limits even when no per-token API bill is issued.

DeepSeek V4.1 Flash is not routed or registered in this profile. [Command Code issue #909](https://github.com/CommandCodeAI/command-code/issues/909) reports missing `tool_calls` since September 22; in addition, [pi-subagents #2483](https://github.com/nicobailon/pi-subagents/issues/2483) reproduces invalid loader arguments with the released 0.71.0. The latter has an unreleased upstream fix; the former needs a successful multi-turn tool-call smoke before this model can resume agent work. MiMo V2.6 Flash is cheaper than Pro but new and unqualified for this workload. Meta's discounted Muse Spark Contributor permits training on supplied prompts and responses, so it is not a default for source code. These choices favor stable completed work over nominal price alone.

## Transport and review discipline

GOAT uses Pi's OpenAI-compatible `commandcode-goat` provider and a runtime `COMMAND_CODE_API_KEY`; Codex uses `openai-codex`. The GOAT profile does not force `x-cmd-zdr`, so data handling follows the active provider terms. Only one writer owns a given diff; independent judges inspect its tests and evidence. Pstack's models are guidance rather than an authorization control. The parent resolves conflicting reviews and runs the project's actual validation before accepting a result.

`pi-subagents` 0.71.0 lazily loads its full delegation tool to reduce unrelated parent prompts. Keep DeepSeek off supervising paths while its released loader and tool-call issues persist. Fresh child contexts and bounded parallelism remain the default. Pi's native compaction preserves recent history and structured summaries; SoL-Pi ObservationPack preserves exact recall of packed observations. Adding Jev's automatic orchestration or compaction would duplicate pstack/Poteto and Pi's lifecycle without demonstrated improvement; see [Pi compaction](https://pi.dev/docs/latest/compaction), [Jev's orchestration](https://github.com/TheoOliveira/pi-jev/blob/main/src/orchestrator.ts), [Jev's compaction](https://github.com/TheoOliveira/pi-jev/blob/main/src/compact.ts), and the [session replay evaluation](https://github.com/iefnaf/pi-jev/blob/main/eval/README.md).

To change a route, edit its executable JSON first, update this rationale, run `node scripts/verify-template.mjs`, and qualify affected models with the live checks in `docs/operations.md`. Do not expand model scope as a response to a provider outage; choose a later explicit launch after inspecting the failure.
