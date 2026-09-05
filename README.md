# pi-engineering-template

A Docker Sandbox template for rigorous software engineering with Pi.

The `pstack` branch is intentionally opinionated. It treats Pi, `pi-subagents`, and `@zenspc/pi-pstack` as the core system and uses a small role-specialized model portfolio rather than a general model gateway.

## Core architecture

- **Pi** is the parent runtime and integration point.
- **pi-subagents** provides isolated children, bounded parallelism, worktrees, artifacts, and model enforcement.
- **pi-pstack** provides Poteto Mode, engineering principles, playbooks, multi-model review, arena, swarm, architecture, and reflection workflows.
- **OpenAI Codex** provides GPT-5.6 Luna and Sol.
- **Command Code GOAT Provider API** provides the specialist Flash models through Pi's native OpenAI-compatible provider path with ZDR forced on every request.

Supporting extensions such as pi-fff, pi-lens, web access, Plannotator, and the footer remain tools. Ponytail supplies a YAGNI-first implementation constraint inside pstack workflows. None of them defines a second engineering lifecycle.

## Model portfolio

The default policy is deliberately small.

| Function | Model | Typical thinking |
| --- | --- | --- |
| Coordinate and integrate | `openai-codex/gpt-5.6-luna` | `max` |
| Escalate and synthesize | `openai-codex/gpt-5.6-sol` | `high` / `max` |
| Find evidence | `commandcode-goat/z-ai/glm-5.3-flash` | `high` |
| Finish bounded work | `commandcode-goat/deepseek/deepseek-v4-flash` | `high` / `max` |
| Judge and review | `commandcode-goat/Qwen/Qwen3.8-Flash` | `medium` / `xhigh` |

This split reflects both upstream pstack's role-oriented design and observed model behavior: GLM is used for discovery, DeepSeek for task completion, and Qwen for disciplined judgment. Luna remains the normal parent. Sol is the escalation model rather than the default hammer.

See `docs/model-policy.md` for the exact pstack role matrix and rationale.

## Command Code GOAT

This branch does **not** install `pi-commandcode-provider`. `models.json` registers a native Pi provider named `commandcode-goat` against the official Provider API:

```text
https://api.commandcode.ai/provider/v1
```

The config hard-codes:

```text
x-cmd-zdr: 1
```

The Docker image also sets `CMD_ZDR=1`. ZDR is an invariant, not an optional mode. If Command Code cannot find ZDR-capable capacity, the request is expected to fail closed.

Provide the API key at runtime. Do not bake it into the image:

```sh
export COMMAND_CODE_API_KEY='...'
```

OpenAI Codex authentication remains independent and is handled by Pi's normal `openai-codex` auth path.

## Build

```sh
docker build -t pi-engineering-template:pstack .
```

## Validate

```sh
node scripts/verify-template.mjs
```

The verifier checks provider invariants, ZDR enforcement, pinned dependencies, the curated model set, supported thinking levels, pstack role coverage, subagent routing, concurrency bounds, and removal of legacy providers.

## Operate

Use Pi normally. For nontrivial work, enable Poteto Mode:

```text
/poteto-mode
```

The committed `pstack-models.json` is already curated. Do not run `/setup-pstack` unless you intentionally want to replace the profile and then update the repository configuration to match.

See `docs/operations.md` for runtime authentication, smoke checks, upgrades, and failure handling.

## Design stance

This branch optimizes for correctness, explicit policy, bounded cost, and reproducibility. It does not preserve old provider names, role assignments, or local workflow abstractions merely for compatibility. When a better foundational design makes an old layer unnecessary, the old layer should disappear.
