# Model Policy

## Transports and subscription boundaries

Pi 1.1.0 supports ChatGPT subscription OAuth on **`openai`**. The `openai-codex` provider is legacy. Claude Pro is used through a separately logged-in **Claude Code CLI**, with pi-subagents' built-in `claude-code` external CLI adapter. Native Pi `anthropic` requests are **not** assumed to consume the Claude Pro subscription; they may be separately billed.

## Role assignment

| Role | Model | Thinking | Rationale |
| --- | --- | --- | --- |
| Parent/orchestrator | `openai/gpt-6.1-sol` | `xhigh` | Preferred subscription and quality/cost operating point |
| Worker, Poteto, engineering execution | `openai/gpt-6.1-sol` | `xhigh` | Minimize rework and preserve high-quality implementation |
| Scout, comment-sicko | `openai/gpt-6.1-sol` | `high` | Bounded reconnaissance |
| Researcher | `openai/gpt-6.1-sol` | `xhigh` | Careful evidence validation |
| Oracle, How explainer, native reviewer | `openai/gpt-6-astra` | `xhigh` | Hard reasoning and internal validation |
| Independent primary reviewer | Claude Code `claude-opus-5-5` | `high` | Cross-model adversarial audit |
| Independent second reviewer | Claude Code `claude-sonnet-5-5` | `high` | Independent second perspective |
| Optional narrowly scoped triage | Claude Code `claude-haiku-5-5` | `medium` | Short review; not a security sign-off |

OpenAI `xhigh` is the requested quality/cost baseline. Anthropic's current effort guide recommends `high` for complex Opus 5.5 work, `medium` or `high` for Sonnet 5.5 depending on task difficulty, and `medium` for most Haiku 5.5 work. These choices are workload policy rather than claims of a universally optimal effort level.

## Subagent tools: preserve role ownership

Do **not** copy the parent's tool registry to every subagent. The pinned pi-subagents package already declares role-specific tools:

- `scout`: `read, grep, find, ls, bash, write, contact_supervisor` (source exploration and a context artifact).
- `researcher`: `read, write, web_search, fetch_content, get_search_content, source_check` (Web evidence).
- `reviewer`: `read, grep, find, ls, watchdog_diff, contact_supervisor` (no source edits).
- `oracle`: `read, grep, find, ls, bash` (inspection/verification).
- `comment-sicko`: its package-defined inspection tools; `how-analyst` uses its local read-only definition.
- `worker` and `poteto-agent`: **`tools: "inherit"`** deliberately, so implementation can use ambient Pi-FFF, Pi-Lens, native mutation and validation tools. Only these implementation roles get the broad active tool surface.

Do not hard-code conditional extension names into startup allowlists. Pi-FFF's `multi_grep` exists only in certain override/indexing states; Pi-Lens has lazily activated tools. The stable `grep` and `find` tool names work independently of whether FFF is active, and workers can call extra extension tools when registered. There are no unnecessary capability restrictions on code-writing workers.

## Independent review bridge

Pstack selectors `claude-code/claude-opus-5-5:high` and `claude-code/claude-sonnet-5-5:high` are **pstack routing tags**, not Pi model IDs. `scripts/patch-pstack.mjs` maps these to `subagent({agent:"claude-code",model:"claude-opus-5-5:high",async:true,task:"..."})`. The adapter validates `--model` and `--effort`. Its read-only profile has *no tools*. The handoff MUST inline the actual diff, relevant snippets, requirements, rubric and test results; paths alone cannot be inspected. If quota/authentication fails, independent review is unavailable: never silently substitute a native reviewer.

`claude-code-writer` is disabled. Native worker scope is Sol-only; native oracle and reviewer are Astra. The strict CLI scope lists only the three approved Claude models. Parent and subagents do not automatically switch accounts or providers on failure.

## Qualification note

SoL-Pi upstream tests against Pi 0.85.1; its newer Git commit does not certify Pi 1.1.0. The upgraded image needs Docker build and authenticated smoke testing. Pi-subagents 0.77.0 improves schema size, async wake behavior, and tool/runtime recovery; Pi-web-access 0.38.0 changes its default OpenAI search model. Refer to `docs/operations.md`.
