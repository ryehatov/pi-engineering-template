# pi-engineering-template

Docker Sandbox template for Pi, pstack / Poteto Mode and native cross-provider review.

## Runtime ownership

- **Pi** owns the native `openai` and `anthropic` providers, authenticated through Pi-managed OAuth logins.
- **pi-subagents** owns child routing, role-specific tool contracts, isolation, model scope and concurrency. The package-defined review tools work with Claude as a normal Pi model; implementation roles inherit registered extension tools.
- **pstack** owns Poteto Mode, workflow playbooks and role hints. The pinned patch routes Interrogate and Arena reviews to native `reviewer` agents instead of external CLI processes.
- **SoL-Pi** supplies parent context efficiency, and **pi-goal** supplies bounded continuation. Pi-FFF, Pi-Lens and other extensions provide search, diagnostics and UI.

## Authentication

Run `/login openai` and select **Sign in with ChatGPT**. Run `/login anthropic` for native Anthropic OAuth. This does not guarantee subscription-included billing from third-party harnesses; verify current provider policy. Never put credentials in image layers. No Claude Code CLI is installed.

## Build / startup

```sh
node scripts/verify-template.mjs
node --test scripts/verify-template.test.mjs
docker build -t pi-engineering-template:pstack .
```

At session startup inspect `/pstack status` and activate `/poteto-mode`. Codemode is enabled additively; native tools remain available. See `docs/operations.md` for live validation and `docs/model-policy.md` for routing. No generic global `AGENTS.md` is installed.
