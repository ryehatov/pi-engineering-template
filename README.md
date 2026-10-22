# Pi engineering template — pstack-claude

A Docker Sandbox image with Pi, the official [pstack-claude](https://github.com/michael-denyer/pstack-claude) Pi package, SoL-Pi, and focused engineering utilities.

## Architecture

- **Pi 1.4.0** owns sessions, native model providers, authentication, and tool execution.
- **pstack-claude** (pinned Git commit) owns Poteto Mode, 65 shared skills, automatic task routing, and the native Pi `agent` tools. Its extension runs child Pi RPC processes, provides background completion notices, optional worktree isolation, agent messaging, questions, and `/loop`.
- **SoL-Pi** optimizes tool observations and parent context. It is not an agent scheduler.
- **pi-claude-code** routes Claude model traffic through the official Claude Code CLI. Pi retains tool execution and agent orchestration; Claude Code owns its own subscription login.
- **Other extensions** provide search, inspection, and UI.

The old `@zenspc/pi-pstack`, `pi-subagents`, and post-install patch are deliberately removed. There is one owner for child-agent orchestration. The Claude Code CLI is installed as a model transport, not an additional orchestrator. No template-wide `AGENTS.md` is installed.

## Model routing

`settings.json` selects `openai/gpt-6.1-sol` with `xhigh` reasoning for the parent. `pstack-models.md` is copied to `~/.pi/agent/pstack-models.md`. The pstack extension reads it directly, including after compaction. The committed panel is `opus` (Sol), `fable` (Astra), `sonnet` (Claude Opus via `claude-code`), and `haiku` (Claude Sonnet via `claude-code`). These are pstack aliases, not provider model names; Claude panel entries use `high` effort.

These are explicit model IDs, not automatic availability checks. The Claude Code models are discovered from the installed CLI; both model IDs must be listed under provider `claude-code` and pass an authenticated smoke test. There is no silent provider substitution. Direct `anthropic/*` OAuth requests previously failed with an extra-usage HTTP 400; this profile routes Claude reviewers through the separate CLI-backed provider instead. The bridge is experimental. Its usage-credit guard stops automatic continuation after detecting overage, but **cannot reverse an already charged request or block every future independent call**. See [operations](docs/operations.md#claude-code-subscription-transport).

## Build and use

~~~sh
node scripts/verify-template.mjs
node --test scripts/*.test.mjs
docker build -t pi-engineering-template:pstack-claude .
~~~

Log in with `/login openai`; as user `agent` inside the sandbox run `claude auth login` and check `claude auth status`. Do not use `/login anthropic` for the `claude-code` provider. In Pi, confirm `/claude-code-status` and `pi --list-models claude-code`. The pstack session hook automatically routes nontrivial tasks to Poteto Mode. You can invoke a skill explicitly using `/skill:poteto-mode`, `/skill:interrogate`, or `/skill:setup-pstack`. Check child execution with `/pstack-agents`.

On a persistent Pi home migrated from an older image, remove any registered `@zenspc/pi-pstack`, `pi-subagents`, and `@narumitw/pi-goal` packages. Remove the obsolete `~/.pi/agent/pi-goal.json` after checking for local changes. A clean image needs no migration command. For persistent homes, update the pstack model sheet and ensure the CLI subscription state is persisted under the same `agent` user (e.g., via a dedicated Claude configuration mount). Never embed tokens in the image.

The Dockerfile installs pinned packages before copying configurable files. `scripts/merge-pi-settings.mjs` preserves the package registrations written by `pi install` while applying managed settings. Changing models, skills, or other configuration therefore does not invalidate the dependency-install layer.

See [operations](docs/operations.md) for live smoke checks and [model policy](docs/model-policy.md) for security and cost boundaries. Static validation is not evidence that the full Docker image or authenticated models work.
