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

## Anthropic OAuth HTTP 400 in child agents

**Failure signature.** An Anthropic child may return `400 invalid_request_error` with `Third-party apps now draw from your extra usage, not your plan limits`. This is a **provider-side usage authorization or billing-classification refusal**, not evidence that the requested Claude model is invalid. Successful OAuth login does not itself establish authorization for a particular usage pool. Do not rewrite Claude role mappings to OpenAI models and do not silently enable paid usage.

The pstack extension launches each child with a new Pi RPC session (`--session-id` and `--model`). Pi can exit with code 0 after a model-level error. Pstack correctly reports `status: failed` based on the assistant response, so `exit code: 0` is not a successful inference. Preserve the failure and its `request_id` for diagnosis; do not retry this non-transient refusal in a loop.

**Reproduce with the requested Claude model, not with a substitute.** Inside the same image, under the same user and environment as the failing pstack process:

~~~sh
pi auth check --provider anthropic --json
pi --print --no-session --no-tools --no-skills --no-context-files \\
  --model anthropic/claude-opus-5-5 "Reply exactly: OK"
pi --print --no-session --no-tools --no-skills --no-context-files \\
  --model anthropic/claude-sonnet-5-5 "Reply exactly: OK"
~~~

`pi auth check` reports built-in credential readiness, **not** remaining plan allowance or provider billing approval. It does not load extensions, so a named `pi-accounts` selection can differ from the credential it checks; the single-model request with normal extensions loaded is the relevant end-to-end test. Do not add `--credentials`, call `print-bearer-token`, or publish `auth.json`; they can expose secrets. The two short requests are real model calls and can consume plan usage or incur authorized costs. If the direct Claude request is rejected with the same 400, pstack fan-out is not the cause. Check the correct Anthropic account and [usage settings](https://claude.ai/settings/usage); if access appears entitled, contact Anthropic support with the error's `request_id`, timestamp, model, and product identity (Pi). Do not assume purchasing credits is necessarily required: the [October 7, 2026 Anthropic update](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) says third-party usage can still draw from subscription limits, while the [login policy](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account) reserves discretion to meter third-party use against credits.

**If direct Pi succeeds but the pstack child fails**, compare the effective account, not just the model ID. `@narumitw/pi-accounts` distinguishes Pi's built-in `/login anthropic` from a named account chosen using `/accounts`. A session-only named-account switch is **not automatically inherited** by pstack's separately launched child session. For a named account, use `/accounts` → **Set default account** → **Anthropic** → the intended account, so new child sessions select it; or deliberately set `PI_ACCOUNT=<saved-name>` in the launching process (this override applies to every managed provider and must not silently fall back). Check `PI_CODING_AGENT_DIR` and the image's persistent Pi home as well. With built-in `/login anthropic`, Pi saves credentials in the agent directory for child processes to load. Do not copy tokens into project settings or shell transcripts.

Run a new child after changing the account or model configuration. A finished child's identity includes its original model; `send_message` resumes that model, not a newly edited mapping. If the model call succeeds, re-run the affected review and require every reviewer to complete before claiming a cross-provider verdict.


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
