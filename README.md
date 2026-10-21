# Pi engineering template — pstack-claude

A Docker Sandbox image with Pi, the official [pstack-claude](https://github.com/michael-denyer/pstack-claude) Pi package, SoL-Pi, and focused engineering utilities.

## Architecture

- **Pi 1.3.0** owns sessions, native model providers, authentication, and tool execution.
- **pstack-claude** (pinned Git commit) owns Poteto Mode, 65 shared skills, automatic task routing, and the native Pi `agent` tools. Its extension runs child Pi RPC processes, provides background completion notices, optional worktree isolation, agent messaging, questions, and `/loop`.
- **SoL-Pi** optimizes tool observations and parent context. It is not an agent scheduler.
- **Other extensions** provide search, inspection, and UI.

The old `@zenspc/pi-pstack`, `pi-subagents`, and post-install patch are deliberately removed. There is one owner for child-agent orchestration. No Claude Code CLI or template-wide `AGENTS.md` is installed.

## Model routing

`settings.json` selects `openai/gpt-6.1-sol` with `xhigh` reasoning for the parent. `pstack-models.md` is copied to `~/.pi/agent/pstack-models.md`. The pstack extension reads it directly, including after compaction. The committed panel is `opus` (GPT-6.1 Sol), `fable` (GPT-6 Astra), `sonnet` (GPT-6 Sol), and `haiku` (GPT-6 Luna). The last two entries use `high` effort. These are upstream pstack family **aliases**, not Anthropic model names; all four resolve to OpenAI models by default.

These are explicit model IDs, not automatic availability checks. Models must exist in the installed Pi catalog and be accessible with the configured credentials. Unavailable reviewers fail visibly; there is no silent provider substitution. The default panel no longer starts Anthropic requests: an Anthropic OAuth login can receive HTTP 400 requiring separately funded *extra usage* even when the parent OpenAI session succeeds. Cross-provider review requires explicit Anthropic billing authorization and a conscious local model-sheet change.

## Build and use

~~~sh
node scripts/verify-template.mjs
node --test scripts/*.test.mjs
docker build -t pi-engineering-template:pstack-claude .
~~~

Log in interactively with `/login openai`. An Anthropic login is **not** required for the default panel. The pstack session hook automatically routes nontrivial tasks to Poteto Mode. You can invoke a skill explicitly using `/skill:poteto-mode`, `/skill:interrogate`, or `/skill:setup-pstack`. Check child execution with `/pstack-agents`.

On a persistent Pi home migrated from an older image, remove any registered `@zenspc/pi-pstack`, `pi-subagents`, and `@narumitw/pi-goal` packages. Remove the obsolete `~/.pi/agent/pi-goal.json` after checking for local changes. A clean image needs no migration command.

The Dockerfile installs pinned packages before copying configurable files. `scripts/merge-pi-settings.mjs` preserves the package registrations written by `pi install` while applying managed settings. Changing models, skills, or other configuration therefore does not invalidate the dependency-install layer.

If your home directory persists across image upgrades, replace the old `~/.pi/agent/pstack-models.md` with the new sheet and start a new Pi session. Resuming a failed child preserves its original model; launch a fresh child instead.

See [operations](docs/operations.md) for live smoke checks and [model policy](docs/model-policy.md) for security and cost boundaries. Static validation is not evidence that the full Docker image or authenticated models work.
