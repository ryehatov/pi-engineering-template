# Model Policy

## Providers and subscriptions

Pi 1.1.0 supports ChatGPT subscription OAuth on its native `openai` provider and Claude Pro/Max subscription OAuth on its native `anthropic` provider. Authenticate with `/login openai` and `/login anthropic` respectively. `openai-codex` is legacy. Do not use API-key credentials unintentionally when the goal is subscription usage. The project installs no Claude Code CLI, external agent bridge or custom provider transport.

## Role assignment

| Role | Model | Thinking | Purpose |
| --- | --- | --- | --- |
| Parent/orchestrator | `openai/gpt-6.1-sol` | `xhigh` | Preferred subscription, implementation planning and coordination |
| Worker / Poteto | `openai/gpt-6.1-sol` | `xhigh` | High-quality implementation and validation |
| Scout / comment-sicko | `openai/gpt-6.1-sol` | `high` | Scoped reconnaissance |
| Researcher | `openai/gpt-6.1-sol` | `xhigh` | Evidence verification |
| Oracle / How explainer | `openai/gpt-6-astra` | `xhigh` | Hard architecture and design questions |
| Native independent reviewer | `anthropic/claude-opus-5-5` | `high` | Independent adversarial audit using Pi's review tools |
| Second opinion (Interrogate/Arena) | `anthropic/claude-sonnet-5-5` | `high` | Additional Claude-family reviewer |
| Optional targeted triage | `anthropic/claude-haiku-5-5` | `medium` | Short tasks; not the release sign-off |

OpenAI `xhigh` is the requested quality/cost baseline. Claude review defaults to `high`; lower effort may be chosen for narrow triage. Model-family independence from OpenAI reduces shared failure modes; two Claude models are not independent model families from each other.

## Subagent tools and authority

Retain the audited pi-subagents role capabilities instead of hardcoding extension tool names:

- `scout`: package-defined `read, grep, find, ls, bash, write, contact_supervisor`.
- `researcher`: package-defined `read, write, web_search, fetch_content, get_search_content, source_check`.
- `reviewer`: package-defined `read, grep, find, ls, watchdog_diff, contact_supervisor`. **This native Pi agent now runs Opus 5.5** and can read the codebase directly.
- `oracle`: package-defined `read, grep, find, ls, bash`.
- `comment-sicko`: package-defined inspection tools. `how-analyst`: local read-only profile.
- `worker` and `poteto-agent`: `tools: "inherit"` intentionally to permit ambient Pi-FFF, Pi-Lens, mutation and test tools. This exception does not apply to other roles.

Pi-FFF's `multi_grep` is conditionally registered, and Pi-Lens activates some tools lazily. Avoid putting conditional names into explicit subagent allowlists. Keep native `grep` and `find` available. A reviewer is read-only by its own tool contract, not because it lacks the Claude Code CLI.

## Independent review routing

Pstack Interrogate/Arena selectors use **real Pi model IDs** (`anthropic/claude-opus-5-5:high` and `anthropic/claude-sonnet-5-5:high`). The pinned pstack patch invokes `subagent()` with `agent: "reviewer"` and the selected native model. This preserves source inspection, runtime evidence and the package's review tool policy. The three Claude models are allowed only for that review role; writers default to Sol but permit explicit Astra selection for pstack synthesis/design workflows. The oracle is Astra.

Do not silently reroute failed reviews to another provider or auth account. `claude-code` and `claude-code-writer` built-in external CLI profiles are disabled.

## Qualification note

SoL-Pi upstream tests against Pi 0.85.1, not Pi 1.1.0. A static check does not establish runtime compatibility. Perform Docker, authenticated model and native subagent smoke tests as described in `docs/operations.md`.
