# Operations and qualification

## Installation

The Dockerfile installs `michael-denyer/pstack-claude`, `earendil-works/pi-claude-code`, and `NVlabs/SoL-Pi` from immutable Git commit SHAs. It also installs the pinned official Claude Code CLI and fails early if the base image has Node <22.19.0 (required by pi-claude-code). Their commit pins uniquely identify the source revisions, so no additional package-version arguments or manifest-version comparisons are needed. The pstack root `package.json` declares the Pi extension and skills directory; no patch is needed.

~~~sh
node scripts/verify-template.mjs
node --test scripts/*.test.mjs
docker build --pull=false -t pi-engineering-template:pstack-claude .
~~~

Static verification checks Git SHA pins, npm version pins, install wiring, pstack model routing, absence of retired dependencies, and relevant Pi/SoL-Pi settings. The settings-merge tests verify package preservation and rejection of unexpected or unpinned packages. A passing static check does **not** prove Docker build, extension loading, model access, or live behavior.

## Docker layer caching and package registration

Pi records every `pi install` in `~/.pi/agent/settings.json` (see the Pi 1.4 packages specification). The Dockerfile installs pinned dependencies before copying application settings and skills. It then runs `scripts/merge-pi-settings.mjs` to keep only the 12 expected pinned package declarations from Pi's generated settings and apply the audited preferences from `settings.json`. Unrecognized or unpinned packages fail the build; inherited image preferences are discarded.

As a result, editing `pstack-models.md`, `settings.json`, `sol-pi.json`, or local skills does not invalidate the dependency-install layer. Changing a Docker `ARG` for a package does invalidate that layer. Keep the package list in the merge script aligned with the `pi install` commands. The Node test suite verifies the names; package versions remain authoritative only in the Dockerfile.

After building, run `pi list` inside the image. It must report the expected packages; a green configuration test alone does not establish installation success.

Pi 1.4.0 queues Codemode scripts when its worker pool is saturated instead of failing immediately. By default, at most two workers are alive across sessions **within one Pi process**. A script waiting for a worker fails after 60 seconds or its own deadline. Increase `PI_CODEMODE_MAX_WORKERS` only after measuring CPU and memory use; this setting does not bound pstack child processes.

## First authenticated session

Start in the built image, with a persistent user home if desired. Use `/login openai` for the parent. For Claude Code subscription transport, authenticate with `claude auth login` (not `/login anthropic`) as the sandbox `agent` user. Never bake credentials into image layers.

~~~sh
pi --version
claude --version
claude auth status
pi list
pi --list-models claude-code
~~~

Confirm Pi 1.4.0, the pinned Claude Code CLI release, and the Git-installed `pstack-claude`, `pi-claude-code`, and SoL-Pi packages; removed packages remain absent. The `claude-code` model list must contain the configured Opus and Sonnet IDs. An available model ID is not proof of an authenticated entitlement. Next, inside an interactive Pi session:

1. Run `/skill:poteto-mode` for an end-to-end plan and verify that the session hook routes a new multi-file task automatically.
2. Run `/skill:how` on a small module. Verify that the `agent` tool launches children and `/pstack-agents` reports their state. Check transcripts under `~/.pi/agent/pstack/<parent-session-id>/agents/`.
3. Run `/skill:interrogate` on a test diff. Verify that Sol and Astra run through OpenAI, while Claude Opus and Sonnet run through the `claude-code` Pi provider backed by the official CLI. Each reviewer must report findings; the model outputs must not be silently substituted.
4. Run a parallel writing task with `isolation: "worktree"` and inspect the retained worktrees and branch diffs. Verify the supervisor reports any unmerged result.
5. Verify SoL-Pi Action Fusion, ObservationPack, and exact `obs_recall` recovery; verify Pi-FFF, Pi-Lens, and direct Web tools still load without an extension error.
6. Exercise `/loop` and `/loop stop` in an interactive session. Verify that stopping the loop cancels its pending wakeup and that no new iteration starts.

If a provider or a required panel entry is missing, fix login or the model sheet and repeat the affected check. Do not report a cross-provider review as completed when a child did not run.

## Claude Code subscription transport

The original native `anthropic/*` OAuth path returned HTTP 400: `Third-party apps now draw from your extra usage, not your plan limits`. That happened on direct Pi calls as well as on pstack children. The new configuration uses the independent `claude-code/*` Pi provider via the official Claude Code executable. **This bridge is experimental; verify actual subscription billing with a live request.**

### Docker Sandbox credential isolation

The `shell-docker` sandbox may inject `ANTHROPIC_API_KEY=proxy-managed` (or other `proxy-managed` placeholders) into **every** exec session. It may also leave `apiKeyHelper: "echo proxy-managed"` in `~/.claude/settings.json`. Either setting can shadow Claude Code's OAuth login. An image-wide `ENV` or a one-time `unset` in an interactive shell does not fix future `sbx exec` commands.

The Docker image replaces the global npm shims for both `pi` and `claude` with `scripts/pstack-auth-launcher.sh`, saving the original executables next to them as `pi.pstack-upstream` and `claude.pstack-upstream`. On every launch the wrapper:

1. Removes **only** Anthropic environment values exactly equal to `proxy-managed`. Real keys are kept so the bridge can reject them, rather than silently change billing.
2. Sets `PI_CLAUDE_CODE_CONFIG_DIR` and `CLAUDE_CONFIG_DIR` to the same absolute directory, by default `$HOME/.config/pstack/claude`. It does not read or mutate the default `~/.claude/settings.json` helper. A custom absolute `PI_CLAUDE_CODE_CONFIG_DIR` overrides the default; `CLAUDE_CONFIG_DIR` alone is ignored.
3. Refuses direct Claude Code calls with explicit API credentials, backend overrides, or Docker Sandbox `SBX_CRED_ANTHROPIC_MODE` other than `none` or `oauth`. The Pi process can still run OpenAI models when Claude authentication is blocked.

The wrapper does not suppress host-side proxy injection. In `apikey` mode, even an empty in-container API-key variable cannot prove the request uses subscription billing. The explicit refusal is intentional. Inspect the host using `sbx secret ls`; remove its relevant Anthropic secret with `sbx secret rm anthropic` (and any sandbox-scoped binding) only if you intend to stop using it. Recheck the effective mode in the sandbox after any change. Do not bypass the launcher using `*.pstack-upstream`.

After rebuilding and creating a sandbox with this image, run **inside** it as `agent`:

~~~sh
command -v pi
command -v claude
printf 'sandbox Anthropic mode: %s\n' "${SBX_CRED_ANTHROPIC_MODE:-unset}"
claude auth login
claude auth status
pi --list-models claude-code
~~~

The launcher uses a separate Claude Code home. Existing `~/.claude` credentials are neither deleted nor migrated; you must log in again once in the new home. Do not put OAuth tokens into the Dockerfile or Git. If the sandbox is recreated, persist `~/.config/pstack/claude` securely if you need the login to survive. `claude auth status` is a configuration check, not proof of subscription-only billing. Use the live smoke tests below and verify usage in the Claude account.

### Qualify credentials and models

Run inside the sandbox as the same Unix user as Pi (normally `agent`). Do not bake credentials into the image.

~~~sh
claude --version
claude auth login
claude auth status
claude -p --model claude-opus-5-5 "Reply exactly: CLI_OK"
pi --list-models claude-code
pi --print --no-session --no-tools --model claude-code/claude-opus-5-5 "Reply exactly: PI_OK"
pi --print --no-session --no-tools --model claude-code/claude-sonnet-5-5 "Reply exactly: SONNET_OK"
~~~

These commands make real model requests and may consume quota or incur charges. The provider discovers available models through the CLI. If either configured model is missing, diagnose the account and model catalog; never substitute a model silently. The `claude-code` provider uses the Claude Code CLI login, **not** Pi's `/login anthropic`. In Pi's interactive mode, use `/claude-code-status` to check installation and login.

The bridge refuses conflicting backend/auth environment variables, including `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, and Bedrock/Vertex/Foundry switches. The image launcher strips only sandbox placeholder values before either `pi` or `claude` starts, and uses `PI_CLAUDE_CODE_CONFIG_DIR` as the single explicit location for CLI subscription credentials. Ensure this directory and credentials are accessible to child Pi processes. Persist CLI configuration under the `agent` user, but do not include tokens in Docker layers. An existing volume over `~/.pi/agent` may mask newly installed Pi packages and the pstack model sheet; verify `pi list` and the runtime sheet.

### Billing and child-agent qualification

The bridge fails a turn when Claude Code reports `rate_limit_event.isUsingOverage`, unless `PI_CLAUDE_CODE_ALLOW_USAGE_CREDITS` is enabled explicitly. Detection occurs **after** an upstream request; a charge that already happened cannot be undone. Leave this opt-in unset and disable separately billed extra usage in Claude settings when plan-only usage is required. Do not change authentication, retry billing rejection, or purchase extra usage without the user's decision.

After the direct calls succeed, start a **fresh** pstack child with `model: "sonnet"`, `effort: "high"`, and `readonly: true`. Confirm its model resolves to `claude-code/claude-opus-5-5` and its final status is `completed`. Only then run the four-model `interrogate` panel. Do not resume an old failed Anthropic agent: pstack preserves the original model in its saved identity.

### Compatibility limits

The pinned upstream bridge has known issues with Opus 5.5 `/tree` summarization, cross-provider transcript replay, and incomplete-stream retry classification. Prefer fresh Claude child sessions for review until those fixes are qualified. The CLI is a model transport, not an agent scheduler; pstack remains the sole orchestrator. The bridge uses a local HTTP turn relay and an inert MCP tool inventory. Its source and the CLI release are pinned for reproducibility.

## Migration of an existing Pi home

The Dockerfile builds a clean home. For persistent homes that still register the old packages (and have verified backups of local configuration):

~~~sh
pi remove npm:@zenspc/pi-pstack
pi remove npm:pi-subagents
pi remove npm:@narumitw/pi-goal
rm -f ~/.pi/agent/pi-goal.json
pi install git:github.com/michael-denyer/pstack-claude@903e7385382389806c59d6989b6274e24165082b
~~~

Replace the old model JSON with the new `~/.pi/agent/pstack-models.md`. Remove obsolete `subagents` settings and old subagent agent-definition folders only after reviewing custom content. The pstack extension owns its own `pstack:` agent types. Existing Pi sessions and credentials do not need to be deleted.

The upstream [Pi mapping](https://github.com/michael-denyer/pstack-claude/blob/903e7385382389806c59d6989b6274e24165082b/plugins/pstack/skills/poteto-mode/references/pi-tools.md) and [equivalence table](https://github.com/michael-denyer/pstack-claude/blob/903e7385382389806c59d6989b6274e24165082b/docs/pi-equivalence.md) document supported behavior and differences from Claude Code.
