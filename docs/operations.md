# Operations and qualification

## Installation

The Dockerfile installs `michael-denyer/pstack-claude` and `NVlabs/SoL-Pi` from immutable Git commit SHAs. Their commit pins uniquely identify the source revisions, so no additional package-version arguments or manifest-version comparisons are needed. The pstack root `package.json` declares the Pi extension and skills directory; no patch is needed.

~~~sh
node scripts/verify-template.mjs
node --test scripts/*.test.mjs
docker build --pull=false -t pi-engineering-template:pstack-claude .
~~~

Static verification checks Git SHA pins, npm version pins, install wiring, pstack model routing, absence of retired dependencies, and relevant Pi/SoL-Pi settings. The settings-merge tests verify package preservation and rejection of unexpected or unpinned packages. A passing static check does **not** prove Docker build, extension loading, model access, or live behavior.

## Docker layer caching and package registration

Pi records every `pi install` in `~/.pi/agent/settings.json` (see the Pi 1.3 packages specification). The Dockerfile installs pinned dependencies before copying application settings and skills. It then runs `scripts/merge-pi-settings.mjs` to keep only the 11 expected pinned package declarations from Pi's generated settings and apply the audited preferences from `settings.json`. Unrecognized or unpinned packages fail the build; inherited image preferences are discarded.

As a result, editing `pstack-models.md`, `settings.json`, `sol-pi.json`, or local skills does not invalidate the dependency-install layer. Changing a Docker `ARG` for a package does invalidate that layer. Keep the package list in the merge script aligned with the `pi install` commands. The Node test suite verifies the names; package versions remain authoritative only in the Dockerfile.

After building, run `pi list` inside the image. It must report the expected packages; a green configuration test alone does not establish installation success.

## First authenticated session

Start in the built image, with a persistent user home if desired. Use `/login openai`. The default four-model panel uses OpenAI only. Use `/login anthropic` only after explicitly enabling and funding third-party Anthropic usage, if you choose to change the local sheet. Never bake credentials into image layers.

~~~sh
pi --version
pi list
pi --list-models
~~~

Confirm `pi --version` is 1.3.0; `pi list` shows the Git-installed pstack-claude and SoL-Pi, but not `pi-subagents`, `@zenspc/pi-pstack`, or `@narumitw/pi-goal`; `pi --list-models` lists every configured ID. Next, inside an interactive Pi session:

1. Run `/skill:poteto-mode` for an end-to-end plan and verify that the session hook routes a new multi-file task automatically.
2. Run `/skill:how` on a small module. Verify that the `agent` tool launches children and `/pstack-agents` reports their state. Check transcripts under `~/.pi/agent/pstack/<parent-session-id>/agents/`.
3. Run `/skill:interrogate` on a test diff. Verify that GPT-6.1 Sol, GPT-6 Astra, GPT-6 Sol, and GPT-6 Luna launch through Pi's OpenAI provider. Each entry must report findings; no external Claude Code CLI should be invoked.
4. Run a parallel writing task with `isolation: "worktree"` and inspect the retained worktrees and branch diffs. Verify the supervisor reports any unmerged result.
5. Verify SoL-Pi Action Fusion, ObservationPack, and exact `obs_recall` recovery; verify Pi-FFF, Pi-Lens, and direct Web tools still load without an extension error.
6. Exercise `/loop` and `/loop stop` in an interactive session. Verify that stopping the loop cancels its pending wakeup and that no new iteration starts.

If a provider or a required panel entry is missing, fix login or the model sheet and repeat the affected check. Do not report a four-model review as completed when a child did not run.

### Anthropic HTTP 400: third-party extra usage

The error `Third-party apps now draw from your extra usage, not your plan limits` is an Anthropic billing/authorization refusal, **not** a Pi spawning failure. Do not retry it automatically: the credit or account setting must change first. The upstream pstack child runner reads the Pi RPC stream and marks a model error as `status: failed` even when the process exits with `exit code: 0`; the process exit code alone is not evidence of successful inference. The default sheet removes Anthropic requests from all four panel slots. Confirm that the runtime sheet is the updated one (`cat ~/.pi/agent/pstack-models.md`) and that `pi --list-models` contains all four OpenAI IDs. Model listing proves catalog presence, not live entitlement: make a small authenticated agent call for every model before relying on the full panel.

If `~/.pi/agent` is on a persistent volume, an image rebuild might not replace its prior sheet. Copy the new `pstack-models.md` from this repository into that directory and restart Pi. A failed agent's recorded model is immutable on resume: `send_message` to the old ID will reuse the old Anthropic model. Spawn a new agent after the sheet changes. For deliberate cross-provider review, see [model policy](model-policy.md#optional-cross-provider-review).

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
