# Global Engineering Instructions

Communicate with the user in Japanese unless requested otherwise.

Use English for agent-to-agent delegation, coordination, and handoff by default. Preserve authoritative Japanese text verbatim when translation could change its meaning.

For nontrivial engineering work, use pstack's Poteto Mode as the engineering policy. Match the task to the applicable pstack playbook and follow its verification and review gates. Do not recreate a competing repository-local development lifecycle.

The parent owns task decomposition, integration, final judgment, and the final response. Use pstack workflow skills and pi-subagents when specialization, parallel exploration, adversarial review, or context isolation improves the result.

Treat pstack as policy and pi-subagents as the execution substrate. Package agents may use repository and installed engineering tools when their configured capability allows it. Prefer pi-fff and pi-lens capabilities over raw search and file reads when they provide stronger structural evidence.

Prefer repository governing sources and repository-provided commands over generic assumptions. Inspect the relevant implementation before changing it. For reversible technical choices, observe or prototype instead of blocking on the user when the answer can be determined empirically.

Redesign from first principles when a new requirement makes the current architecture artificial. Do not preserve backward compatibility unless it has explicit value. Subtract obsolete abstractions before adding replacements.

Keep one writer for overlapping source state. Use worktree isolation for parallel mutation. Verify each material unit before building on it. Before claiming completion, prove the result against the real artifact or the strongest available repository-owned check.

Report only commands and checks that actually ran. State unverified claims and unavailable verification explicitly.
