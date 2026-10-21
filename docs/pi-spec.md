# Pi Engineering Specification

This document defines repository and harness invariants. It does not define a second agent workflow. `MUST`, `MUST NOT`, `SHOULD`, and `MAY` have their usual RFC-style meaning.

## 1. Responsibility boundaries

1. Pi MUST remain the interactive parent runtime and own the native session, model registry, and compaction primitives.
2. SoL-Pi MUST own parent-session tool/result/context optimization: Action Fusion, ObservationPack, Evidence-Preserving Reducer, and Online Context Compact.
3. `pi-subagents` MUST own delegated execution, isolation, child capabilities, model-scope enforcement, concurrency, and delegated authority policy.
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
2. Pi's native `openai` and `anthropic` providers MUST own their respective subscription OAuth transports; the template MUST NOT install a custom GOAT `models.json` provider or external Claude Code CLI.
3. `subagent-config.json` MUST own delegated execution bounds and authority policy.
4. `pstack-models.json` MUST own pstack role-to-model selectors.
5. `sol-pi.json` MUST own SoL-Pi mechanism enablement and cache-write/read ratio.
6. `scripts/verify-template.mjs` MUST validate structural invariants and consistency across these files without depending on natural-language prompt phrases.

## 4. Provider invariants

1. The parent and implementation subagents MUST use Pi's built-in `openai` provider through Sign in with ChatGPT, not legacy `openai-codex`.
2. Independent Claude auditors MUST use Pi's native `anthropic` provider with Claude Pro/Max subscription OAuth, not an external CLI adapter.
3. Committed Docker and JSON files MUST NOT contain secrets, the retired Command Code GOAT provider or a Claude Code CLI installation.
4. A native Claude reviewer MUST retain the package-defined `reviewer` tool contract and be able to inspect source files.
## 5. Model and role consistency

1. The subagent model scope MUST be strict and enforced and MUST list the two native OpenAI model IDs and the three native Anthropic model IDs explicitly.
2. Parent, native child, pstack and side-question routes MUST agree on the committed model portfolio.
3. Pstack reviewer selectors MUST use real `anthropic/` model IDs, and the patched skills MUST invoke the native `reviewer` agent.
4. Thinking levels MUST be explicit, and a failed model MUST NOT silently reroute to another provider.
5. The worker/Poteto scope MUST permit explicit Astra selections required by pstack workflows.
6. Pstack role keys MUST match the pinned package's role schema exactly.
## 6. Delegated execution invariants

1. Delegated context MUST default to `fresh`.
2. Delegation depth, spawn count, global concurrency, and ordinary parallel concurrency MUST have finite bounds.
3. Missions and scheduled runs MUST remain disabled in the default profile.
4. Schedule creation MUST be forbidden by delegated authority policy.
5. Roles configured as source-read-only MUST NOT receive source-mutation tools.
6. `defaultProjectTrust` MUST remain `never`.
7. Docker Sandbox remains the outer process and filesystem isolation boundary.
8. Generic subagent availability recovery MUST require a later explicit launch rather than same-launch automatic model switching, and any rerouted model MUST remain within strict model scope.
9. The template MUST NOT weaken child capability or isolation policy merely to force ambient SoL-Pi loading into delegated children.
10. Explicit static tool lists MUST NOT contain conditionally registered extension names (including `multi_grep`).
11. Built-in Pi-subagents role tool definitions MUST remain package-owned unless a specific role requires an override.
12. Only implementation roles `worker` and `poteto-agent` MAY inherit ambient extension tools; this is not the default for every child.
13. Both external `claude-code` and `claude-code-writer` profiles MUST remain disabled; native reviewers MUST retain the package-defined read-only tools.
14. The local `how-analyst` MUST remain read-only, and built-in search tool names MUST work without optional extension activation.
## 7. SoL-Pi invariants

1. Action Fusion and ObservationPack MUST be enabled in the committed profile.
2. Evidence-Preserving Reducer and Online Context Compact MUST be disabled in the committed profile.
3. `cacheWriteReadRatio` MUST remain `12.5`.
4. SoL-Pi MUST be installed from the official NVlabs Git package source at a pinned 40-hex commit ref. The Dockerfile MUST state the expected manifest version and fail if the installed package version differs.
5. `sol-pi.json` MUST be copied to Pi's user-wide agent directory so the template behavior does not depend on downstream project trust.
6. SoL-Pi MUST use Pi's public extension/model/session interfaces; the template MUST NOT patch or vendor Pi to support it.

## 8. Dependency and image invariants

1. The base image MUST be pinned by SHA-256 digest.
2. Pi, Bun, npm-installed extensions, and Git-installed SoL-Pi MUST use explicit immutable pins.
3. Runtime configuration files MUST be copied into their expected Pi locations.
4. The Docker image MUST NOT copy a template-level `AGENTS.md`.
5. Package pins MUST be qualified as a compatible set. A newer release MUST NOT replace a qualified pin when a known upstream compatibility regression affects the configured runtime path.
6. Pi 1.3.0 MUST be pinned with pi-context-view 0.7.2, pi-subagents 0.80.0, and a SoL-Pi revision tested against Pi 1.3.0.
7. Pi Codemode MUST be additive, so native reviewer and Web research tools remain directly reachable.
8. Subagent tool declaration pinning and model-aware activation MUST remain enabled; active async runs and cumulative session spawns MUST be finite.
9. Automatic context-view probing MUST remain disabled to avoid extension handlers running for synthetic requests.

## 9. Verification

The static verifier MUST check at least:

- required configuration and documentation files and JSON validity;
- absence of the template-level `AGENTS.md` and its Docker injection;
- strict explicit model scope and model-reference consistency;
- correct parent provider/model qualification and native Anthropic reviewer selectors;
- native OpenAI and Anthropic subscription provider routing;
- current pi-subagents configuration semantics, including the explicit no-automatic-fallback policy and absence of retired exclusion settings;
- preservation of package-owned role tools and intentional implementation-role ambient tools;
- pinned pi-pstack package-version/schema compatibility, exact role coverage, and model/thinking selector validity;
- SoL-Pi mechanism flags, cache ratio, official Git commit ref, manifest version assertion, and Docker wiring;
- source-read-only role capability boundaries;
- delegation, concurrency, mission, schedule, and authority bounds;
- pinned base image plus the audited Pi and extension version matrix;
- absence of legacy providers, model routes and embedded credentials.

A passing static verifier does not prove live provider availability, model routing, tool-call compatibility, extension lifecycle compatibility, or package-install compatibility. Release qualification SHOULD also include a Docker build, smoke tests for the enabled SoL-Pi mechanisms, and authenticated calls for routes affected by the change.

## 10. Operator activation

Pstack activation is an operator/session concern, not a repository prompt concern. The normal operating procedure MAY inspect /pstack status and enter `/poteto-mode` at Pi startup. Once active, the extension-provided state is authoritative for engineering workflow; SoL-Pi remains the parent runtime optimization layer.
