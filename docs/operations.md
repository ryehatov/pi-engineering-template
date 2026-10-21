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

## Anthropic OAuth HTTP 400 in direct and child calls

### Confirmed failure boundary

An Anthropic OAuth request can receive `400 invalid_request_error` with `Third-party apps now draw from your extra usage, not your plan limits`. This is a provider-side **usage entitlement or billing-classification refusal**, not an invalid Claude model slug or evidence that pstack failed to spawn a process.

The failure is reproducible by calling the Claude model **directly through Pi, without the pstack `agent` tool**. Therefore pstack fan-out, worker process creation, background notices, and child account inheritance cannot explain this direct-request failure. Changing the configured Claude reviewers to a different model or provider would hide the failure rather than repair it.

Pstack correctly marks an agent `failed` when the Pi RPC assistant reports an error, even if the operating-system process exits with code 0. An exit code is not evidence of successful inference. Treat this HTTP 400 as non-transient: do not retry in a loop or launch a large reviewer panel until one direct request succeeds.

### Reproduce without subagents

In the same runtime and Pi home as the incident:

~~~sh
pi auth check --provider anthropic --json
pi --print --no-session --no-tools --no-skills --no-context-files \
  --model anthropic/claude-opus-5-5 "Reply exactly: OK"
~~~

The auth check reports credential readiness, **not** provider permission to spend plan or usage credits. It does not load extensions and may not reflect a named `pi-accounts` account; the direct request is the end-to-end check. This is a real model invocation and may consume authorized usage or incur charges. Keep the `request_id` and timestamp; never print OAuth tokens or upload `auth.json`.

Optionally, test the official Claude Code CLI on the same subscription account with `claude -p "Reply exactly: OK"` outside the Docker image, if Claude Code is already installed. If Claude Code succeeds while Pi is refused, report a third-party-client classification mismatch to Anthropic; it does **not** authorize imitating the first-party client.

### Supported recovery choices

1. **Retain subscription-limit billing:** Anthropic's [October 7, 2026 Agent SDK guidance](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) says third-party apps can still use subscription limits. Its [account-login policy](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account) reserves discretion to charge third-party usage against credits. These two statements do not guarantee an individual Pi account's entitlement. If the direct request gets this 400 despite an active plan, contact [Anthropic support](https://support.claude.com/) with the `request_id`, UTC timestamp, plan, target model, product identity (Pi), and the relevant two official articles. No local Pi configuration can grant an entitlement Anthropic refuses.
2. **Opt in to separately billed usage:** Review [Claude usage settings](https://claude.ai/settings/usage). If available and acceptable, explicitly enable/fund extra usage and set a spending limit. This is a **user billing decision**, not a configuration patch. Do not automatically authorize purchases or claim that the subscription covers these calls. Recheck the direct request after changing the entitlement.
3. **Use Claude Console API credits, without changing Claude models:** As of October 2026, [Max and Team plans](https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-and-team-plans) include monthly credits for the Claude API, available after eligibility and explicit linking to one Console organization through Claude's billing settings. Pro is not eligible. Console API credits are **distinct from Claude extra usage** and require an API key from the linked organization. They do not apply to the existing subscription OAuth request. Remaining Console credits and spend limits control API billing, including potential overage after included credits. This option keeps the existing `anthropic/claude-*` model IDs and pstack reviewer mapping.

For the Console-key path, choose the API-key authentication method when reconfiguring Pi's built-in Anthropic provider:

- Pi resolves a saved credential in `auth.json` **before** `ANTHROPIC_API_KEY`. Adding the environment variable alone will not replace a saved OAuth credential. In an interactive Pi session, use `/logout anthropic` to remove the old stored provider credential, then `/login anthropic` and select API-key authentication with your Console key. Alternatively, after clearing the stored Anthropic OAuth entry, provide `ANTHROPIC_API_KEY` through a secret manager or the process environment.
- If `@narumitw/pi-accounts` selects a separate named Anthropic account, inspect `/accounts` and establish the intended default for future sessions. Do not assume that removing the built-in OAuth credential also changes the extension's account choice.
- Start Pi and launch a **new pstack agent** after the credential change. The pstack child is a separate process. The original agent identity fixes the model and other launch settings on resume, while the newly selected provider credential is loaded when the process starts. Confirm one direct Claude model call and one child call before a full four-model review.
- Keep API keys, OAuth tokens, and `auth.json` out of repositories, image layers, command-line arguments, and transcripts. Do not spoof Claude Code/Agent SDK identity or modify provider headers to evade billing classification.

### If direct Pi succeeds but only child agents fail

Then diagnose child-only state: compare `PI_CODING_AGENT_DIR`, `auth.json`, the selected default account in `/accounts`, and any `PI_ACCOUNT` override. A session-local named-account switch is **not automatically inherited** by pstack's new child session. Pstack launches the child with `--session-id` and `--model`, but not the parent's interactive account-selection state. Keep the selected Claude model unchanged. Do not call a cross-provider review completed until every required reviewer reports success.

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
