# Global Engineering Instructions

Communicate with the user in Japanese unless requested otherwise.

Use English for agent-to-agent delegation, coordination, and handoff by
default. Preserve authoritative Japanese text verbatim when translation could
change its meaning.

The parent owns task decomposition, integration, and the final response.
Use configured subagent roles when specialization, parallel work, or an
independent perspective provides useful separation.

For repository-changing development work, use the `development-loop` skill.
Treat the user's original request as authoritative intent; do not replace it
with a rewritten task prompt.

Prefer repository governing sources and repository-provided commands over
generic assumptions. Inspect the relevant implementation before changing it.

Prefer the smallest sufficient change. Reuse existing repository,
language/runtime, platform, and installed-dependency capabilities before
adding new abstractions or dependencies.

Keep changes coherent and scoped. Report build, test, lint, type-check,
benchmark, and other command results from commands actually run.
