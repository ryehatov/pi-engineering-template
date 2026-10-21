# Operations and qualification

## Installation

The Dockerfile installs `michael-denyer/pstack-claude` at the commit for release `v0.9.97` and verifies `package.json` reports `0.9.97`. Its root `package.json` declares the Pi extension and shared skill directory; no skill checkout or patch is needed. SoL-Pi is also pinned to an official commit and its manifest version is checked.

~~~sh
node scripts/verify-template.mjs
node --test scripts/verify-template.test.mjs
docker build --pull=false -t pi-engineering-template:pstack-claude .
~~~

Static verification checks pins, install wiring, pstack sheet roles and model aliases, retired dependencies, and relevant Pi/SoL-Pi settings. A passing static check does **not** prove Docker build, extension loading, model access, or live behavior.

## First authenticated session

Start in the built image, with a persistent user home if desired. Use `/login openai`; use `/login anthropic` only after confirming access and billing conditions. Never bake credentials into image layers.

~~~sh
pi --version
pi list
pi --list-models
~~~

Confirm `pi --version` is 1.3.0; `pi list` shows the Git-installed pstack-claude and SoL-Pi, not either retired package; `pi --list-models` lists every configured ID. Next, inside an interactive Pi session:

1. Run `/skill:poteto-mode` for an end-to-end plan and verify that the session hook routes a new multi-file task automatically.
2. Run `/skill:how` on a small module. Verify that the `agent` tool launches children and `/pstack-agents` reports their state. Check transcripts under `~/.pi/agent/pstack/<parent-session-id>/agents/`.
3. Run `/skill:interrogate` on a test diff. Verify that Sol, Astra, Claude Opus, and Claude Sonnet launch through Pi's native providers. Each entry must report findings; no external Claude Code CLI should be invoked.
4. Run a parallel writing task with `isolation: "worktree"` and inspect the retained worktrees and branch diffs. Verify the supervisor reports any unmerged result.
5. Verify SoL-Pi Action Fusion, ObservationPack, and exact `obs_recall` recovery; verify Pi-FFF, Pi-Lens, and direct Web tools still load without an extension error.
6. Exercise `/loop` and `/loop stop` in an interactive session. Test `/goal` on a separate task, not at the same time. Verify the session terminates within the configured Goal bounds.

If a provider or a required panel entry is missing, fix login or the model sheet and repeat the affected check. Do not report a cross-provider review as completed when a child did not run.

## Migration of an existing Pi home

The Dockerfile builds a clean home. For persistent homes that still register the old packages:

~~~sh
pi remove npm:@zenspc/pi-pstack
pi remove npm:pi-subagents
pi install git:github.com/michael-denyer/pstack-claude@a369e70b8afac1ec3dbad14bc7491d40baf27cce
~~~

Replace the old model JSON with the new `~/.pi/agent/pstack-models.md`. Remove obsolete `subagents` settings and old subagent agent-definition folders only after reviewing custom content. The pstack extension owns its own `pstack:` agent types. Existing Pi sessions and credentials do not need to be deleted.

The upstream [Pi mapping](https://github.com/michael-denyer/pstack-claude/blob/v0.9.97/plugins/pstack/skills/poteto-mode/references/pi-tools.md) and [equivalence table](https://github.com/michael-denyer/pstack-claude/blob/v0.9.97/docs/pi-equivalence.md) document supported behavior and differences from Claude Code.
