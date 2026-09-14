# Pi Engineering Specification

This document defines repository and harness invariants. It does not define a second agent workflow. `MUST`, `MUST NOT`, `SHOULD`, and `MAY` have their usual RFC-style meaning.

## 1. Responsibility boundaries

1. Pi MUST remain the interactive parent runtime and own the native session, model registry, and compaction primitives.
2. SoL-Pi MUST own parent-session tool/result/context optimization: Action Fusion, ObservationPack, Evidence-Preserving Reducer, and Online Context Compact.
3. `pi-subagents` MUST own delegated execution, isolation, child capabilities, model-scope enforcement, concurrency, fallback selection, and delegated authority policy.
4. `@zenspc/pi-pstack` MUST own pstack playbooks, Poteto Mode, engineering-method context, and pstack role routing.
5. SoL-Pi MUST NOT become the authority for pstack workflow semantics, generic role routing, delegated capabilities, or delegated authority.
6. Extension-specific guidance MUST remain with the extension that provides it when that extension already injects the guidance at runtime.
7. Repository documentation MAY explain these mechanisms, but documentation MUST NOT become an enforcement dependency.

## 2. Prompt boundary

1. This template MUST NOT install a repository-global `AGENTS.md` for generic engineering workflow, model routing, provider policy, tool restrictions, or extension behavior.
2. A rule that can be represented and rejected by configuration or extension code MUST be enforced there rather than repeated as a model instruction.
3. Poteto Mode, Ponytail, and SoL-Pi behavior MUST NOT be duplicated in template-level agent instructions when their runtime mechanisms already provide it.
4. A downstream project MAY add project-specific agent instructions when the project has requirements that are not supplied or enforced by this template.

## 3. Executable sources of truth

1. `settings.json` MUST own Pi defaults and generic subagent model/tool configuration.
2. `models.json` MUST own custom provider transport and model metadata.
3. `subagent-config.json` MUST own delegated execution bounds and authority policy.
4. `pstack-models.json` MUST own pstack role-to-model selectors.
5. `sol-pi.json` MUST own SoL-Pi mechanism enablement, EPR reducer provider/model selection, and OCC cache-write/read ratio.
6. `scripts/verify-template.mjs` MUST validate structural invariants and consistency across these files without depending on natural-language prompt phrases.

## 4. Provider invariants

1. The Command Code provider MUST use `https://api.commandcode.ai/provider/v1` with the `openai-completions` API adapter.
2. Its credential MUST resolve from `$COMMAND_CODE_API_KEY`; no credential may be committed or baked into the image.
3. The default Command Code provider MUST NOT force `x-cmd-zdr`; runtime availability of the selected model takes precedence over zero-retention enforcement in this profile.
4. The template MUST NOT claim that non-ZDR Command Code traffic has zero retention.
5. Legacy OpenCode Go and `pi-commandcode-provider` routes MUST NOT be runtime dependencies of this branch.
6. SoL-Pi EPR MUST resolve through `commandcode-goat/deepseek/deepseek-v4.1-flash` and MUST reuse Pi-managed provider transport and authentication rather than define separate credentials or endpoints.

## 5. Model and role consistency

1. `subagents.modelScope` MUST be enabled and strict.
2. The scope MUST use explicit provider-qualified model IDs for the committed portfolio; wildcard expansion is not permitted in this profile.
3. The Pi parent, generic subagent defaults, named subagent overrides, subagent fallback selectors, pstack selectors, side-question model configuration, and SoL-Pi EPR reducer MUST resolve within the committed model portfolio.
4. A Command Code selector MUST request a thinking level supported by that model's `thinkingLevelMap`.
5. A model id that itself contains `/` MUST NOT be mistaken for a provider-qualified Pi selector when validating the separate `defaultProvider` and `defaultModel` fields.
6. DeepSeek V4.1 Flash behind the Command Code proxy MUST declare the model-local DeepSeek thinking and reasoning-history compatibility required by Pi's OpenAI-completions adapter.
7. The verifier MUST check pstack role coverage independently of the selected model assignments so model-policy changes do not require prompt changes.

## 6. Delegated execution invariants

1. Delegated context MUST default to `fresh`.
2. Delegation depth, spawn count, global concurrency, and ordinary parallel concurrency MUST have finite bounds.
3. Missions and scheduled runs MUST remain disabled in the default profile.
4. Schedule creation MUST be forbidden by delegated authority policy.
5. Roles configured as source-read-only MUST NOT receive source-mutation tools.
6. `defaultProjectTrust` MUST remain `never`.
7. Docker Sandbox remains the outer process and filesystem isolation boundary.
8. Availability fallbacks MUST remain within strict model scope and MUST NOT be treated as a semantic replacement for the oracle tier.
9. The template MUST NOT weaken child capability or isolation policy merely to force ambient SoL-Pi loading into delegated children.

## 7. SoL-Pi invariants

1. Action Fusion, ObservationPack, Evidence-Preserving Reducer, and Online Context Compact MUST all be enabled in the committed profile.
2. EPR reducer provider MUST be `commandcode-goat` and reducer model MUST be `deepseek/deepseek-v4.1-flash`.
3. OCC `cacheWriteReadRatio` MUST be `12.5` until the template deliberately adopts a different cache-economics policy.
4. SoL-Pi MUST be installed from an explicit 40-hex Git commit pin.
5. `sol-pi.json` MUST be copied to Pi's user-wide agent directory so the template behavior does not depend on downstream project trust.
6. SoL-Pi MUST use Pi's public extension/model/session interfaces; the template MUST NOT patch or vendor Pi to support it.

## 8. Dependency and image invariants

1. The base image MUST be pinned by SHA-256 digest.
2. Pi, Bun, npm-installed extensions, and Git-installed SoL-Pi MUST use explicit immutable pins.
3. Runtime configuration files MUST be copied into their expected Pi locations.
4. The Docker image MUST NOT copy a template-level `AGENTS.md`.

## 9. Verification

The static verifier MUST check at least:

- required configuration and documentation files and JSON validity;
- absence of the template-level `AGENTS.md` and its Docker injection;
- strict explicit model scope and model-reference consistency;
- correct parent provider/model qualification when a model id contains `/`;
- Command Code provider URL, API type, credential reference, and absence of forced default ZDR routing;
- subagent fallback selectors and their model/thinking validity;
- pstack role coverage and model/thinking selector validity;
- SoL-Pi all-enabled configuration, EPR route, OCC ratio, commit pin, and Docker wiring;
- source-read-only role capability boundaries;
- delegation, concurrency, mission, schedule, and authority bounds;
- pinned base image, Pi, Bun, and extension versions;
- absence of retired provider and model routes.

A passing static verifier does not prove live provider availability, model routing, tool-call compatibility, extension lifecycle compatibility, or package-install compatibility. Release qualification SHOULD also include a Docker build, SoL-Pi mechanism smoke tests, and authenticated calls for routes affected by the change.

## 10. Operator activation

Pstack activation is an operator/session concern, not a repository prompt concern. The normal operating procedure MAY inspect pstack state and enter `/poteto-mode` at Pi startup. Once active, the extension-provided state is authoritative for engineering workflow; SoL-Pi remains the parent runtime optimization layer.
