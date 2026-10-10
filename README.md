# pi-engineering-template

Docker Sandbox template for Pi, pstack / Poteto Mode and independent Claude Code reviews.

## Runtime ownership

- **Pi** owns native sessions and the `openai` provider, authenticated with **Sign in with ChatGPT**. `openai-codex` is legacy.
- **pi-subagents** owns child routing, tool contracts, isolation, model allowlists and concurrency. Package-defined role capabilities are preserved. Implementation roles alone inherit active extension tools.
- **Claude Code CLI** provides independent read-only reviews through pi-subagents' `claude-code` external CLI adapter. Its subscription login is separate from Pi and its adapter has no filesystem tools.
- **pstack** owns Poteto Mode, workflow playbooks and model-role hints. A version-pinned patch adapts the independent-review skills to Claude Code CLI.
- **SoL-Pi** supplies parent context efficiency; **pi-goal** supplies bounded continuation. Pi-FFF, Pi-Lens, and other extensions provide search, diagnostics and UI.

## Authentication

Run `/login openai` in Pi and select **Sign in with ChatGPT**. Log into `claude` interactively inside the sandbox as the same `agent` user. Do not use Pi's `anthropic` API provider to consume Claude Pro; that may result in separately billed API usage. Never bake credentials into Docker layers.

## Build / startup

```sh
node scripts/verify-template.mjs
docker build -t pi-engineering-template:pstack .
```

At session startup, inspect `/pstack status` and activate `/poteto-mode`. See `docs/operations.md` for live validation and `docs/model-policy.md` for routing. No global generic `AGENTS.md` is installed.
