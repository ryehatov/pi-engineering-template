---
name: development-loop
description: Use for repository-changing engineering work, including bug fixes, features, refactors, performance work, migrations, security-sensitive changes, concurrency changes, and formal-verification changes.
---

# Development Loop

Preserve the user's original request as authoritative intent. Do not replace it with a rewritten task prompt. Derive task-local goals, constraints, and acceptance conditions only when they help execution.

Use gates, not a fixed phase sequence. Apply the minimum process that makes the change trustworthy.

## Before changing code

Inspect the relevant current governing sources, implementation, and verification surface.

Resolve material uncertainty first when inspection, reproduction, a minimal experiment, or a proof attempt is cheaper than implementing under an assumption. If prior non-obvious project findings may avoid expensive rediscovery, use `engineering-cache` narrowly.

Plan only when ambiguity, coordination, multi-step work, architectural impact, or risk makes a plan useful. Use existing planning and subagent facilities when they add separation or evidence; do not create another orchestration scheme.

## While changing code

Prefer the smallest coherent change that satisfies the user's intent. If a material assumption fails, return to investigation instead of accumulating speculative patches.

Scale rigor with risk. Security, cryptography, concurrency, persistent-data changes, formal verification, architecture changes, and irreversible operations warrant explicit assumptions, stronger evidence, and independent challenge when applicable.

## Before completion

Run current repository-owned verification relevant to the requested behavior. Code inspection, prior results, cached notes, and reviewer assertions do not substitute for current evidence.

Use independent review when the change is non-trivial, high-risk, or meaningful uncertainty remains. Resolve material findings and re-run affected verification before declaring completion.

## After verification

Persist knowledge only when expected rediscovery cost exceeds maintenance and staleness cost:

- Discard facts that current code, one command, standard documentation, or Git history can recover cheaply.
- Record an ADR only for a hard-to-reverse, surprising decision produced by a genuine trade-off.
- Use `engineering-cache` for expensive project-specific findings, failed approaches, constraints, invariants, counterexamples, or verification assumptions.
- Promote a procedure to a reusable Skill only after repeated verified use shows that it generalizes.

Do not create documentation merely to summarize the task.
