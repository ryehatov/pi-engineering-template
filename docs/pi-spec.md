# Pi Engineering Specification

This document defines repository and harness invariants. It does not define a second agent workflow. `MUST`, `MUST NOT`, `SHOULD`, and `MAY` have their usual RFC-style meaning.

## 1. Responsibility boundaries

1. Pi MUST remain the interactive parent runtime.
2. `pi-subagents` MUST own delegated execution, isolation, child capabilities, model-scope enforcement, concurrency, fallback selection, and delegated authority policy.
3. `@zenspc/pi-pstack` MUST own pstack playbooks, Poteto Mode, engineering-method context, and pstack role routing.
4. Extension-specific guidance MUST remain with the extension that provides it when that extension already injects the guidance at runtime.
5. Repository documentation MAY explain these mechanisms, but documentation MUST NOT become an enforcement dependency.

## 2. Prompt boundary

1. This template MUST NOT install a repository-global `AGENTS.md` for generic engineering workflow, model routing, provider policy, tool restrictions, or extension behavior.
2. A rule that can be represented and rejected by configuration or extension code MUST be enforced there rather than repeated as a model instruction.
3. Poteto Mode and Ponytail behavior MUST NOT be duplicated in template-level agent instructions when their extensions already provide that runtime context.
4. A downstream project MAY add project-specific agent instructions when the project has requirements that are not supplied or enforced by this template.

## 3. Executable sources of truth

1. `settings.json` MUST own Pi defaults and generic subagent model/tool configuration.
2. `models.json` MUST own custom provider transport, data-routing headers, and model metadata.
3. `subagent-config.json` MUST own delegated execution bounds and authority policy.
4. `pstack-models.json` MUST own pstack role-to-model selectors.
5. `scripts/verify-template.mjs` MUST validate structural invariants and consistency across these files without depending on natural-language prompt phrases.

## 4. Provider invariants

1. The Command Code provider MUST use `https://api.commandcode.ai/provider/v1` with the `openai-completions` API adapter.
2. Its credential MUST resolve from `$COMMAND_CODE_API_KEY`; no credential may be committed or baked into the image.
3. Command Code requests MUST send `x-cmd-zdr: 1` so a request fails instead of using a non-ZDR upstream.
4. Legacy OpenCode Go and `pi-commandcode-provider` routes MUST NOT be runtime dependencies of this branch.

## 5. Model and role consistency

1. `subagents.modelScope` MUST be enabled and strict.
2. The scope MUST use explicit provider-qualified model IDs for the committed portfolio; wildcard expansion is not permitted in this profile.
3. The Pi parent, generic subagent defaults, named subagent overrides, subagent fallback selectors, pstack selectors, and side-question model configuration MUST resolve within that scope, except for the literal `inherit` capability where explicitly allowed.
4. A Command Code selector MUST request a thinking level supported by that model's `thinkingLevelMap`.
5. A model id that itself contains `/` MUST NOT be mistaken for a provider-qualified Pi selector when validating the separate `defaultProvider` and `defaultModel` fields.
6. The verifier MUST check pstack role coverage independently of the selected model assignments so model-policy changes do not require prompt changes.

## 6. Delegated execution invariants

1. Delegated context MUST default to `fresh`.
2. Delegation depth, spawn count, global concurrency, and ordinary parallel concurrency MUST have finite bounds.
3. Missions and scheduled runs MUST remain disabled in the default profile.
4. Schedule creation MUST be forbidden by delegated authority policy.
5. Roles configured as source-read-only MUST NOT receive source-mutation tools.
6. `defaultProjectTrust` MUST remain `never`.
7. Docker Sandbox remains the outer process and filesystem isolation boundary.
8. Availability fallbacks MUST remain within strict model scope and MUST NOT be treated as a semantic replacement for the oracle tier.

## 7. Dependency and image invariants

1. The base image MUST be pinned by SHA-256 digest.
2. Pi, Bun, and every installed extension MUST use explicit versions.
3. Runtime configuration files MUST be copied into their expected Pi locations.
4. The Docker image MUST NOT copy a template-level `AGENTS.md`.

## 8. Verification

The static verifier MUST check at least:

- required configuration and documentation files and JSON validity;
- absence of the template-level `AGENTS.md` and its Docker injection;
- strict explicit model scope and model-reference consistency;
- correct parent provider/model qualification when a model id contains `/`;
- Command Code provider URL, API type, credential reference, and enforced ZDR header;
- subagent fallback selectors and their model/thinking validity;
- pstack role coverage and model/thinking selector validity;
- source-read-only role capability boundaries;
- delegation, concurrency, mission, schedule, and authority bounds;
- pinned base image, Pi, Bun, and extension versions;
- absence of retired provider and model routes.

A passing static verifier does not prove live provider availability, model routing, tool-call compatibility, or package-install compatibility. Release qualification SHOULD also include a Docker build and authenticated smoke calls for routes affected by the change.

## 9. Operator activation

Pstack activation is an operator/session concern, not a repository prompt concern. The normal operating procedure MAY inspect pstack state and enter `/poteto-mode` at Pi startup. Once active, the extension-provided state is authoritative for the model session.
