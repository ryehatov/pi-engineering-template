# Pi Engineering Design

## Architecture

The template uses a layered design.

`@zenspc/pi-pstack` owns engineering policy. Poteto Mode selects playbooks and principles, and pstack workflow skills provide architecture exploration, adversarial review, swarms, arena comparisons, debugging discipline, and shipping gates.

`pi-subagents` owns delegated execution. It provides agent discovery, model routing, bounded nested delegation, concurrency control, worktree isolation, and run artifacts.

pi-fff, pi-lens, DAP, web access, Plannotator, and other installed extensions provide concrete capabilities. They are not workflow owners.

Docker Sandbox owns process and filesystem isolation outside Pi.

This separation is deliberate. A local lifecycle skill that redefines planning, completion, or durable knowledge would compete with pstack and increase prompt and maintenance cost.

## Poteto agent capability

The upstream `poteto-agent` package definition declares a fixed tool list. pi-subagents applies `agentOverrides` to package agents, so this template overrides `poteto-agent.tools` to `inherit` and enables nested delegation.

This avoids forking pstack while preserving access to installed engineering tools. It also keeps upstream pstack updates independently consumable.

## Parent model inheritance

Pstack's default semantic is `inherit-parent`. A fixed model override on the generic `worker` would silently defeat that behavior. The template therefore leaves `worker.model` unset and includes `inherit` in the strict pi-subagents model scope.

Explicit pstack roles are committed in `pstack-models.json`. High-judgment roles use GPT-5.6 Sol. Exploration and swarm roles use a cheaper model. Multi-model review roles use heterogeneous models where possible.

## Nested fan-out

A top-level Poteto agent may need to invoke a routed pstack workflow, which then starts worker agents. `maxSubagentDepth: 1` blocks this valid shape. The template raises the bound to `2` and keeps explicit spawn and concurrency limits.

The intended shape is:

```text
parent Pi
  -> poteto-agent or pstack workflow
      -> bounded workers/reviewers
```

Additional recursive orchestration is outside the default design.

## Tool policy

pi-fff runs in override mode. This gives stable `grep` and `find` tool names while allowing stronger search and navigation behavior.

Scout, Reviewer, and Oracle use explicit tool allow lists. They receive Lens read tools. Reviewer and Oracle do not receive source mutation or debug mutation tools.

Worker and Poteto agents inherit tools because implementation and verification can benefit from repository-specific and installed extensions. Capability inheritance remains bounded by the parent process and pi-subagents runtime policy.

## Pstack scripts

Pstack ships `orch` and `watch-pr` scripts that run under Bun. The image installs a pinned Bun package instead of relying on a host-provided binary.

## Removed components

The previous `development-loop` skill is removed. Poteto Mode already provides task classification, playbook selection, sequencing, verification, review, and shipping discipline.

The previous `engineering-cache` skill is removed. Pstack already provides `recall`, `why`, and `show-me-your-work` for reconstructing context, investigating shared history, and recording decision trails. Durable repository knowledge should be encoded in repository artifacts and checks instead of a parallel cache protocol.

## Verification strategy

`scripts/verify-template.mjs` checks structure and configuration without relying on model behavior. It verifies dependency pins, pstack model configuration, model-scope compatibility, tool boundaries, recursion and concurrency bounds, required environment variables, and removal of obsolete lifecycle files.

A successful static verifier does not prove that every external model or package service is available at runtime. Docker build and a live Pi smoke test remain the strongest integration checks when the execution environment permits them.
