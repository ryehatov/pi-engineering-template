# Operations and qualification

## Installation

The Dockerfile installs `michael-denyer/pstack-claude` and `NVlabs/SoL-Pi` from immutable Git commit SHAs. Their commit pins uniquely identify the source revisions, so no additional package-version arguments or manifest-version comparisons are needed. The pstack root `package.json` declares the Pi extension and skills directory; no patch is needed.

~~~sh
node scripts/verify-template.mjs
node --test scripts/verify-template.test.mjs
docker build --pull=false -t pi-engineering-template:pstack-claude .
~~~

Static verification checks the Git SHA pins, npm version pins, install wiring, pstack sheet roles and model aliases, absence of retired dependencies, and relevant Pi/SoL-Pi settings. A passing static check does **not** prove Docker build, extension loading, model access, or live behavior.

## First authenticated session

Start in the built image, with a persistent user home if desired. Use `/login openai`; use `/login anthropic` only after confirming access and billing conditions. Never bake credentials into image layers.

~~~sh
pi --version
pi list
pi --list-models
~~~

Confirm `pi --version` is 1.3.0; `pi list` shows the Git-installed pstack-claude and SoL-Pi, but not `pi-subagents`, `@zenspc/pi-pstack`, or `@narumitw/pi-goal`; `pi --list-models` lists every configured ID. Next, inside an interactive Pi session:

1. Run `/skill:poteto-mode` for an end-to-end plan and verify that the session hook routes a new multi-file task automatically.
2. Run `/skill:how` on a small module. Verify that the `agent` tool launches children and `/pstack-agents` reports their state. Check transcripts under `~/.pi/agent/pstack/<parent-session-id>/agents/`.
3. Run `/skill:interrogate` on a test diff. Verify that Sol, Astra, Claude Opus, and Claude Sonnet launch through Pi's native providers. Each entry must report findings; no external Claude Code CLI should be invoked.
4. Run a parallel writing task with `isolation: "worktree"` and inspect the retained worktrees and branch diffs. Verify the supervisor reports any unmerged result.
5. Verify SoL-Pi Action Fusion, ObservationPack, and exact `obs_recall` recovery; verify Pi-FFF, Pi-Lens, and direct Web tools still load without an extension error.
6. Exercise `/loop` and `/loop stop` in an interactive session. Verify that stopping the loop cancels its pending wakeup and that no new iteration starts.

If a provider or a required panel entry is missing, fix login or the model sheet and repeat the affected check. Do not report a cross-provider review as completed when a child did not run.

## Migration of an existing Pi home

The Dockerfile builds a clean home. For persistent homes that still register the old packages:

~~~sh
pi remove npm:@zenspc/pi-pstack
pi remove npm:pi-subagents
pi remove npm:@narumitw/pi-goal
rm -f ~/.pi/agent/pi-goal.json
pi install git:github.com/michael-denyer/pstack-claude@a369e70b8afac1ec3dbad14bc7491d40baf27cce
~~~

Replace the old model JSON with the new `~/.pi/agent/pstack-models.md`. Remove obsolete `subagents` settings and old subagent agent-definition folders only after reviewing custom content. The pstack extension owns its own `pstack:` agent types. Existing Pi sessions and credentials do not need to be deleted.

The upstream [Pi mapping](https://github.com/michael-denyer/pstack-claude/blob/a369e70b8afac1ec3dbad14bc7491d40baf27cce/plugins/pstack/skills/poteto-mode/references/pi-tools.md) and [equivalence table](https://github.com/michael-denyer/pstack-claude/blob/a369e70b8afac1ec3dbad14bc7491d40baf27cce/docs/pi-equivalence.md) document supported behavior and differences from Claude Code.
