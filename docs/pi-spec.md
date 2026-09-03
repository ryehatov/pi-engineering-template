# Pi Engineering Specification

This document is normative. `MUST`, `MUST NOT`, `SHOULD`, and `MAY` have their usual RFC-style meaning.

## 1. Core ownership

1. Pi MUST be the parent runtime.
2. `pi-subagents` MUST be the delegated-execution substrate.
3. `@zenspc/pi-pstack` MUST be the engineering-policy layer for nontrivial work.
4. Repository-local automation MAY add capabilities or checks, but MUST NOT establish a second mandatory engineering lifecycle that competes with pstack.

## 2. Parent model

1. The default parent provider MUST be `openai-codex`.
2. The default parent model MUST be `gpt-5.6-luna`.
3. The default parent thinking level MUST be `max`.
4. `gpt-5.6-sol` MUST remain an escalation model rather than the generic child default.

## 3. Command Code provider

1. The repository MUST define `commandcode-goat` in `models.json`.
2. Its base URL MUST be `https://api.commandcode.ai/provider/v1`.
3. Its API type MUST be `openai-completions` for the committed specialist models.
4. Its API key MUST resolve from `$COMMAND_CODE_API_KEY`; no credential may be committed or baked into the image.
5. It MUST send `x-cmd-zdr: 1` on every request.
6. The image MUST set `CMD_ZDR=1` as defense in depth.
7. A ZDR routing failure MUST fail closed. The template MUST NOT remove ZDR or switch to a retaining route as an automatic recovery.
8. `pi-commandcode-provider`, OpenCode Go, and reverse-engineered Command Code transports MUST NOT be runtime dependencies of this branch.

## 4. Model set

The strict Command Code model set MUST be exactly:

- `deepseek/deepseek-v4-flash`
- `z-ai/glm-5.3-flash`
- `Qwen/Qwen3.8-Flash`

The strict complete subagent model scope MUST contain only `inherit`, those three Command Code models, and:

- `openai-codex/gpt-5.6-luna`
- `openai-codex/gpt-5.6-sol`

New models MUST NOT be added merely for optionality. A new permanent model SHOULD replace an existing role owner or demonstrate a previously uncovered task shape.

## 5. Thinking support

The Command Code model definitions MUST encode these selectable effort sets:

- DeepSeek V4 Flash: `high`, `max`
- GLM 5.3 Flash: `low`, `high`, `max`
- Qwen 3.8 Flash: `low`, `medium`, `xhigh`

Pstack model selectors MAY append a Pi thinking suffix. The verifier MUST reject a suffix unsupported by the selected Command Code model.

`max` SHOULD be reserved for bounded high-value reasoning. High-fan-out swarm work SHOULD normally use `high` because redundancy already adds error reduction.

## 6. Pstack profile

1. `pstack-models.json` MUST use version `1` until upstream changes its schema.
2. Every upstream pstack role MUST be present and MUST have an explicit real model selector; `inherit-parent` and `auto` are not valid committed role values for this profile.
3. Panel roles MUST remain arrays with at least two entries.
4. `skillsEnabled` MUST be `true`.
5. The committed profile MUST use only models allowed by strict `modelScope`.
6. `/setup-pstack` is an interactive generic mapper and MUST NOT be treated as the source of truth for the committed profile.

## 7. Generic subagent roles

1. The generic subagent default MUST be DeepSeek V4 Flash at `high`.
2. `scout` MUST use GLM 5.3 Flash at `low`; `researcher` MUST use it at `high`.
3. `worker` MUST use DeepSeek V4 Flash at `high` and inherit ambient engineering tools.
4. `reviewer` MUST use Qwen 3.8 Flash at `medium` and MUST NOT receive source-mutation tools.
5. `oracle` MUST use GPT-5.6 Sol at `max` and MUST NOT receive source-mutation tools.
6. `poteto-agent` MUST inherit the parent model, use `high`, inherit ambient tools, and allow nested subagents.
7. `comment-sicko` MUST use Qwen 3.8 Flash at `medium`.
8. Generic `delegate` and `gpt-pro` package agents MUST remain disabled in this profile.

## 8. Delegation bounds

1. Delegated context MUST default to `fresh`.
2. `maxSubagentDepth` MUST be `2`.
3. Per-run child spawns MUST have an explicit finite bound no greater than `32` in the default profile.
4. Global concurrency MUST be no greater than `8`.
5. Ordinary parallel concurrency MUST be no greater than `4` and no greater than global concurrency.
6. The model-exclusion TTL MUST be explicitly bounded to no more than five minutes in the default profile.
7. Missions and scheduled runs MUST be disabled by default.
8. Schedule creation MUST be forbidden by authority policy.

## 9. Tool and isolation policy

1. `defaultProjectTrust` MUST remain `never`.
2. pi-fff MUST remain in `override` mode while this template relies on its stable `grep` and `find` names.
3. Reviewer and Oracle MUST remain source-read-only.
4. Parallel writers MUST use separate worktrees or non-overlapping ownership.
5. Docker Sandbox remains the outer process/filesystem isolation boundary.

## 10. Dependency policy

1. The base image MUST be pinned by SHA-256 digest.
2. Pi and every installed extension MUST use explicit versions.
3. Bun MUST be explicitly pinned because pstack orchestration scripts depend on it.
4. `pi-subagents` MUST be at least the pinned version whose configuration contract this repository verifies. Version changes require re-running the verifier and reviewing upstream release notes.

## 11. Verification

The repository verifier MUST check at least:

- required files and JSON validity;
- provider URL, auth reference, API type, and literal ZDR header;
- absence of OpenCode Go and `pi-commandcode-provider` runtime configuration;
- exact allowed model set;
- Command Code thinking-level maps;
- parent defaults and strict model scope;
- generic subagent role assignments and read-only boundaries;
- complete pstack role coverage and supported model-thinking selectors;
- recursion, spawn, concurrency, exclusion-TTL, mission, and schedule bounds;
- pinned Pi, pi-subagents, pi-pstack, and Bun versions;
- Docker copies of `models.json` and `pstack-models.json`;
- pstack policy language in `AGENTS.md`.

A passing static verifier does not prove live provider availability. Release qualification SHOULD also include a Docker build and authenticated smoke calls for the model routes that changed.
