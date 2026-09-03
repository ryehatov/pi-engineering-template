# Engineering Operating Contract

Communicate with the user in Japanese unless requested otherwise. Use English for agent-to-agent delegation and handoff. Preserve authoritative source text verbatim when translation could change meaning.

## Core

This environment has three workflow owners only.

1. Pi owns the interactive parent session, tools, model runtime, and final answer.
2. `pi-subagents` owns delegated execution, isolation, fan-out, artifacts, budgets, and child lifecycle.
3. `@zenspc/pi-pstack` owns engineering method: Poteto Mode, playbooks, principles, architecture exploration, adversarial review, and verification discipline.

Everything else is a capability provider, not a workflow owner. Do not create a competing repository-local lifecycle, planner, memory protocol, or review framework when pstack already owns the concern.

For nontrivial engineering work, use Poteto Mode and match the task to the applicable pstack playbook. The parent owns decomposition, integration, final judgment, and the final response. Subagents produce evidence and candidate work; they do not transfer ownership.

## Model routing

Route by task shape, not prestige.

- **Find -> GLM 5.3 Flash.** Use for codebase reconnaissance, evidence collection, dependency tracing, and `why` investigations. Give it a bounded question and an explicit stop condition because it tends to keep searching after finding enough evidence.
- **Finish -> DeepSeek V4 Flash.** Use for autonomous execution, mechanical or well-scoped implementation, swarms, hillclimbs, and tooling work where completion matters more than taste.
- **Judge -> Qwen 3.8 Flash.** Use for review, policy adherence, ambiguity detection, and deciding when evidence is insufficient. Prefer it when disciplined refusal is more valuable than additional exploration.
- **Coordinate -> GPT-5.6 Luna.** The normal parent and integration model. Use it for feature/refactor shaping, explanation, candidate comparison, and coherent implementation across boundaries.
- **Escalate -> GPT-5.6 Sol.** Reserve it for hardest tasks, root-cause-heavy bugs, architecture, synthesis, and final high-stakes judgment.

OpenAI GPT-5.6 Luna and Sol must route through `openai-codex`. Command Code models must route through the native `commandcode-goat` provider in `models.json`. Never route GPT-5.6 Luna or Sol through Command Code in this template.

Command Code is ZDR-only. The provider config hard-codes `x-cmd-zdr: 1`, and the image also sets `CMD_ZDR=1`. A ZDR routing failure is a real failure. Do not bypass it, remove the header, or fall back to a retaining provider to make a run pass.

The committed `pstack-models.json` is the engineering profile. Its model selectors include Pi thinking suffixes. Do not run `/setup-pstack` casually: it is an interactive generic mapper and can erase the curated model x thinking policy. Change the committed profile and verifier together instead.

## Engineering rules

Inspect the implementation and governing repository artifacts before changing behavior. Prefer repository commands, tests, and typed interfaces over assumptions.

Redesign from first principles when a requirement makes the current shape artificial. Backward compatibility is not a default objective on this branch. Preserve it only when it protects a concrete consumer, migration boundary, or external contract. Delete obsolete abstractions in the same change that replaces them.

Use one writer for overlapping source state. Parallel mutation requires separate worktrees or disjoint ownership. Parallel read-only investigation is encouraged when it increases evidence coverage.

Use pi-fff and pi-lens when they provide stronger structural evidence than raw file walking. Use DAP for runtime debugging when source inspection is insufficient. Tool choice must serve the pstack playbook rather than replace it.

Keep the parent context clean. Delegate bulk exploration and repetitive inspection. Return compact evidence with exact paths, symbols, commands, and observed results.

Before claiming completion, verify the real artifact with the strongest available repository-owned check. For runtime behavior, reproduce or smoke-test the actual surface when feasible. Report only checks that actually ran. State unverified claims explicitly.

## Cost and concurrency

Reasoning depth is role-specific. Do not promote every task to `max`. Fan-out already buys redundancy, so swarm work normally uses `high`; `max` is reserved for bounded high-value candidates, synthesis, architecture, and the hardest tasks.

Do not widen the model allowlist just because a new model exists. New models enter through a deliberate role-specific evaluation. Prefer replacing an existing role owner over accumulating another permanent model.

Respect the configured concurrency limits. The Command Code account is a shared resource, and transient provider failures can temporarily exclude a model. Prefer a smaller, higher-signal fan-out to a large homogeneous wave.

## Completion

A task is complete only when the requested artifact exists, the material verification ran, review findings are resolved or explicitly reported, and the final response accurately states what changed and what remains uncertain.
