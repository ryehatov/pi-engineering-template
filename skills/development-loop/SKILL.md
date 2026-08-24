---
name: development-loop
description: Use for repository-changing engineering work, including bug fixes, features, refactors, performance work, migrations, security-sensitive changes, concurrency changes, and formal-verification changes.
---

# Development Loop

Preserve the user's original request as authoritative intent. Do not replace it with a rewritten task prompt. Derive task-local goals, constraints, and acceptance conditions only when they help execution.

Use gates, not a fixed phase sequence. Apply the minimum process that makes the change trustworthy.

## Before changing code

Inspect the relevant current governing sources, implementation, and verification surface.

If `docs/engineering/cache/` exists, perform one narrow lookup using terms from the current task before non-trivial investigation. Do not load the cache wholesale. For relevant candidates, use `engineering-cache` to check freshness and revalidate material claims against current repository evidence.

Treat an assumption as material when it can change the implementation, interface, safety property, or acceptance result. Resolve material uncertainty first when inspection, reproduction, a minimal experiment, or a proof attempt is cheaper than implementing under the assumption.

Plan only when ambiguity, coordination, multi-step work, architectural impact, or risk makes a plan useful. Use existing planning and subagent facilities when they add separation or evidence; do not create another orchestration scheme.

## While changing code

Prefer the smallest coherent change that satisfies the user's intent. If a material assumption fails, return to investigation instead of accumulating speculative patches.

Scale rigor with risk. Require explicit assumptions and independent challenge when a change affects a trust boundary, cryptographic or security property, concurrency invariant, persistent data, public or cross-component contract, formal-verification assumption, architecture boundary, or irreversible operation. Otherwise use independent challenge when material uncertainty remains or direct verification cannot cover a consequential non-local claim.

## Before completion

Close each material completion claim with current evidence. Run current repository-owned verification relevant to the requested behavior. For a reported failure, reproduce and re-check the same observation when practical. Evidence may include tests, builds, type checks, lint, benchmarks, direct observation, or proof results. Code inspection, prior results, cached notes, and reviewer assertions do not substitute for current evidence. Report any material claim that was not directly verified as a verification gap.

When independent challenge is required or useful, give the reviewer the changed artifact and acceptance contract rather than the implementation rationale when practical. Resolve material findings and re-run affected verification before declaring completion.

## After verification

Classify whether the task produced durable knowledge. Usually the correct result is to discard it. Persist knowledge only when expected rediscovery cost exceeds maintenance and staleness cost:

- Discard facts that current code, one command, standard documentation, or Git history can recover cheaply.
- Record an ADR only for an architecturally significant choice with a credible alternative, non-obvious rationale, and meaningful coupling or reversal cost. Typical candidates affect public or cross-component interfaces, persistent-data representation, trust boundaries, major platform or dependency choices, or ownership boundaries. Follow the repository's declared or established ADR convention. If none exists, do not invent a repository-wide ADR location or format; report the candidate decision to the user.
- Use `engineering-cache` only for verified, project-specific, non-obvious findings that are likely to affect future engineering work, are costly enough to rediscover, and have a meaningful invalidation surface.
- Promote a procedure to a reusable Skill only after repeated verified use shows that it generalizes.

Do not create documentation merely to summarize the task.
