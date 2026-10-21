# Pi engineering template — pstack-claude

A Docker Sandbox image with Pi, the official [pstack-claude](https://github.com/michael-denyer/pstack-claude) Pi package, SoL-Pi, and focused engineering utilities.

## Architecture

- **Pi 1.3.0** owns sessions, native model providers, authentication, and tool execution.
- **pstack-claude** (pinned Git commit) owns Poteto Mode, 65 shared skills, automatic task routing, and the native Pi `agent` tools. Its extension runs child Pi RPC processes, provides background completion notices, optional worktree isolation, agent messaging, questions, and `/loop`.
- **SoL-Pi** optimizes tool observations and parent context. It is not an agent scheduler.
- **Other extensions** provide search, inspection, and UI.

The old `@zenspc/pi-pstack`, `pi-subagents`, and post-install patch are deliberately removed. There is one owner for child-agent orchestration. No Claude Code CLI or template-wide `AGENTS.md` is installed.

## Model routing

`settings.json` selects `openai/gpt-6.1-sol` with `xhigh` reasoning for the parent. `pstack-models.md` is copied to `~/.pi/agent/pstack-models.md`. The pstack extension reads it directly, including after compaction. The committed panel is `opus` (Sol), `fable` (Astra), `sonnet` (Claude Opus), and `haiku` (Claude Sonnet). Anthropic panel entries use `high` effort.

These are explicit model IDs, not automatic availability checks. Models must exist in the installed Pi catalog and be accessible with the configured credentials. Unavailable reviewers fail visibly; there is no silent provider substitution. **Anthropic use through Pi may incur separately billed token usage**, including when a Claude subscription is connected.

If direct Pi inference also returns HTTP 400 with `Third-party apps now draw from your extra usage`, the refusal is **not caused by pstack**. The Claude aliases must remain unchanged. See the [provider authorization recovery procedure](docs/operations.md#anthropic-oauth-http-400-in-direct-and-child-calls) for a support escalation, explicit extra-usage opt-in, or Claude Console API credits (eligible Max/Team plans). No automatic paid-usage activation, credential switching, provider substitution, or third-party identity spoofing is performed.

## Build and use

~~~sh
node scripts/verify-template.mjs
node --test scripts/*.test.mjs
docker build -t pi-engineering-template:pstack-claude .
~~~

Log in interactively with `/login openai` and, for the cross-provider panel, `/login anthropic`. The pstack session hook automatically routes nontrivial tasks to Poteto Mode. You can invoke a skill explicitly using `/skill:poteto-mode`, `/skill:interrogate`, or `/skill:setup-pstack`. Check child execution with `/pstack-agents`.

On a persistent Pi home migrated from an older image, remove any registered `@zenspc/pi-pstack`, `pi-subagents`, and `@narumitw/pi-goal` packages. Remove the obsolete `~/.pi/agent/pi-goal.json` after checking for local changes. A clean image needs no migration command.

The Dockerfile installs pinned packages before copying configurable files. `scripts/merge-pi-settings.mjs` preserves the package registrations written by `pi install` while applying managed settings. Changing models, skills, or other configuration therefore does not invalidate the dependency-install layer.

See [operations](docs/operations.md) for live smoke checks and [model policy](docs/model-policy.md) for security and cost boundaries. Static validation is not evidence that the full Docker image or authenticated models work.
