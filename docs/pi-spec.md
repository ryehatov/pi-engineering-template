# Pi Engineering Specification

## Objective

Provide a generic software-development environment in which Pi performs rigorous engineering work with pstack/Poteto policy, bounded multi-agent execution, strong repository inspection tools, and reproducible sandbox isolation.

## Engineering policy

`@zenspc/pi-pstack` is the authoritative engineering workflow layer. Nontrivial work routes through Poteto Mode and its playbooks. The template must not add a second mandatory lifecycle that competes with pstack.

Pstack principles govern architecture, delegation, verification, and prose. In particular, the template supports first-principles redesign, subtraction before addition, explicit domain modeling, real-artifact verification, context isolation, and non-blocking reversible work.

## Delegation

`pi-subagents` is the execution substrate. Delegated work must remain bounded by model scope, recursion depth, spawn budgets, and concurrency limits.

The effective model scope must include `inherit` so pstack roles configured as `inherit-parent` behave as specified. Selected explicit models must remain inside the enforced allow list.

`poteto-agent` must inherit ambient tools. This is required because its upstream package definition otherwise fixes a narrow built-in tool list and would prevent use of installed engineering tools such as pi-fff and pi-lens.

Read-only reviewer roles use explicit tool allow lists. Mutation-capable implementation work uses the parent capability set only when the configured agent policy permits it.

## Model routing

The parent default is GPT-5.6 Luna. High-judgment pstack roles use GPT-5.6 Sol. Exploration and broad swarm work use a cheaper fast model. Independent review uses a distinct model where useful.

The committed `pstack-models.json` is the reproducible default. `/setup-pstack` may replace it at runtime.

## Recursion and parallelism

`maxSubagentDepth` is `2`. Depth 1 is insufficient for a top-level `poteto-agent` that must invoke pstack workflow fan-out. Depth greater than 2 is not required for the default design.

The template sets explicit per-run spawn and global concurrency bounds. Parallel work that can mutate overlapping state must use separate worktrees or a one-writer design.

## Tooling

Use `override` mode through the revision-controlled `pi-fff.json`.

Scout, Reviewer, and Oracle use explicit tool allow lists. Their lists expose stable `grep` and `find` names and explicit Lens read tools. Reviewer and Oracle remain read-only with respect to source mutation.

Worker and Poteto agents may inherit ambient tools. This allows package-provided and project-provided engineering capabilities to participate in implementation and verification.

## Isolation

Docker Sandbox is the outer security boundary. `defaultProjectTrust` remains `never`.

Managed worktree cleanup may remain automatic within pi-subagents. Missions and durable scheduled runs remain disabled by default.

## Dependencies

All Dockerfile dependencies must use explicit versions. The base image must use a SHA-256 digest. Pstack's bundled orchestration scripts require Bun, so the image must install a pinned Bun version.

## Verification

Before completion claims, verify the real artifact with repository-owned checks where available. The template verifier must check at least:

- pstack and pi-subagents are installed at pinned versions;
- Bun is installed for pstack scripts;
- pstack model roles are present and valid;
- model scope permits both explicit selected models and parent inheritance;
- `poteto-agent` inherits tools and may delegate;
- recursion, spawn, and concurrency bounds are explicit;
- obsolete mandatory `development-loop` and `engineering-cache` files are absent;
- pi-fff and Lens capability invariants are preserved.
