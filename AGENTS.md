# Engineering Operating Contract

Communicate with the user in Japanese unless requested otherwise. Use English for agent-to-agent delegation and handoff. Preserve authoritative source text verbatim when translation could change meaning.

## Core

This environment has three workflow owners only.

1. Pi owns the interactive parent session, tools, model runtime, and final answer.
2. `pi-subagents` owns delegated execution, isolation, fan-out, artifacts, budgets, and child lifecycle.
3. `@zenspc/pi-pstack` owns engineering method: Poteto Mode, playbooks, principles, architecture exploration, adversarial review, and verification discipline.

Everything else is a capability provider, not a workflow owner. Do not create a competing repository-local lifecycle, planner, memory protocol, or review framework when pstack already owns the concern.

For nontrivial engineering work, use Poteto Mode and match the task to the applicable pstack playbook. The parent owns decomposition, integration, final judgment, and the final response. Subagents produce evidence and candidate work; they do not transfer ownership.

Ponytail constrains implementation scope inside the active pstack workflow. It is not a workflow owner. Apply its YAGNI-first rules after locating the correct change boundary; prefer deletion, reuse, native facilities, and the smallest correct diff without weakening required safeguards.

## Model routing

Route by task shape, not prestige.

- **Read -> DeepSeek V4 Flash.** Use for cache-heavy reconnaissance, repeated inspection, and compact evidence collection where the same large context is likely to be read again. Keep it read-only by default. Do not use it as the generic worker merely because its cache-read price is low.
- **Execute -> GLM 5.3 Flash.** Use for the normal delegated workload: feature/refactor implementation, bug and performance fixes after the parent has framed the problem, research, swarms, hillclimbs, and other bounded autonomous work.
- **Judge -> Qwen 3.8 Flash.** Use for review, policy adherence, ambiguity detection, synthesis, explanation, and deciding when evidence is insufficient. `Qwen3.8-Flash` is the production model corresponding to Qwen3.8-Flash-Next in this portfolio.
- **Coordinate -> GPT-6 Astra.** The normal interactive parent. Run it at `low` by default after requirements have been hardened through grilling or an equivalent specification pass. Its job is decomposition, routing, integration, and final judgment; delegate bulk reads instead of filling the parent context with raw evidence.
- **Oracle -> GPT-5.6 Sol.** Reserve it for explicit bounded second opinions when deeper independent analysis is worth OpenAI-Codex quota. It is not a normal pstack worker and should not appear in automatic pstack role panels.

GPT-6 Astra and GPT-5.6 Sol must route through `openai-codex`. Command Code models must route through the native `commandcode-goat` provider in `models.json`. Never route OpenAI models through Command Code in this template.

Command Code is ZDR-only. The provider config hard-codes `x-cmd-zdr: 1`, and the image also sets `CMD_ZDR=1`. A ZDR routing failure is a real failure. Do not bypass it, remove the header, or fall back to a retaining provider to make a run pass.

The committed `pstack-models.json` is the engineering profile. Its model selectors include Pi thinking suffixes. Do not run `/setup-pstack` casually: it is an interactive generic mapper and can erase the curated model x thinking policy. Change the committed profile and verifier together instead.

## Engineering rules

Inspect the implementation and governing repository artifacts before changing behavior. Prefer repository commands, tests, and typed interfaces over assumptions.

Redesign from first principles when a requirement makes the current shape artificial. Backward compatibility is not a default objective on this branch. Preserve it only when it protects a concrete consumer, migration boundary, or external contract. Delete obsolete abstractions in the same change that replaces them.

Use one writer for overlapping source state. Parallel mutation requires separate worktrees or disjoint ownership. Parallel read-only investigation is encouraged when it increases evidence coverage.

Use pi-fff and pi-lens when they provide stronger structural evidence than raw file walking. Tool choice must serve the pstack playbook rather than replace it.

Subagent launches default to background execution. Keep that default for roles that depend on ambient extensions such as pi-fff, pi-lens, or pi-web-access. An explicit foreground launch must use only Pi-native tools or explicitly loaded child extensions.

Keep the parent context clean. Delegate bulk exploration and repetitive inspection. Return compact evidence with exact paths, symbols, commands, and observed results. Prompt-cache hits reduce provider cost but do not remove those tokens from a child context; context isolation comes from delegation and compact handoff.

Before claiming completion, verify the real artifact with the strongest available repository-owned check. For runtime behavior, reproduce or smoke-test the actual surface when feasible. Report only checks that actually ran. State unverified claims explicitly.

## Cost and concurrency

Reasoning depth is role-specific. Do not promote every task to `max`. The Astra parent stays at `low` unless a concrete decision requires escalation. Fan-out already buys redundancy, so normal delegated work uses GLM `high`; `max` is reserved for bounded high-value candidates and architecture panels.

Use DeepSeek for cache-dominant, low-output reads, not as a blanket cheap-model default. Fresh-input and generated-output work normally belongs to GLM or Qwen according to task shape. Keep Sol out of automatic panels; invoke the oracle only when the expected information gain justifies the separate OpenAI-Codex spend.

Do not widen the model allowlist just because a new model exists. New models enter through a deliberate role-specific evaluation. Prefer replacing an existing role owner over accumulating another permanent model.

Respect the configured concurrency limits. The Command Code account is a shared resource, and transient provider failures can temporarily exclude a model. Prefer a smaller, higher-signal fan-out to a large homogeneous wave.

## Completion

A task is complete only when the requested artifact exists, the material verification ran, review findings are resolved or explicitly reported, and the final response accurately states what changed and what remains uncertain.
