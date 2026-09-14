# Operations

## Session startup

The normal interactive startup routine is:

```text
pstack state
/poteto-mode
```

This is operator state. Once Poteto Mode is active, pstack supplies its workflow context directly; no repository-global prompt is required to restate it. SoL-Pi is already loaded as a parent runtime optimization layer and does not require a separate workflow activation command.

## Runtime credentials

### OpenAI Codex

The committed model route remains `openai-codex/gpt-6-astra`.

Named subscription accounts are managed by `@narumitw/pi-accounts`. Run `/accounts` to log in to and name the two Codex accounts, for example `codex-a` and `codex-b`.

The initial registration of each account uses Pi's normal OAuth login flow. Subsequent account selection does not require a new browser login while the saved OAuth credential remains refreshable.

Use **Set default account** to choose the account inherited by new sessions. Use **Switch ... account** to change only the current session. Account selection changes authentication identity only. It does not change the provider ID, model ID, subagent role routing, or fallback policy.

Do not install or invoke a quota-reset or token-reset-ticket redemption mechanism as part of this profile. In particular, do not install `@narumitw/pi-usage` for this work.

### Command Code GOAT

Create a Command Code API key in Studio and inject it only at runtime:

```sh
export COMMAND_CODE_API_KEY='...'
```

`models.json` references the variable; the Dockerfile never receives the secret as an `ARG` or committed `ENV` value.

The committed provider does not force `x-cmd-zdr`. This avoids `422 cmd_zdr_no_providers` failures when DeepSeek, GLM, or another selected model has no ZDR-capable upstream with capacity. This also means the template does not guarantee zero retention. Use only data appropriate for the active Command Code and upstream-provider terms.

SoL-Pi EPR uses the same Command Code credential through the Pi model registry. Its committed reducer route is `commandcode-goat/deepseek/deepseek-v4.1-flash`; SoL-Pi has no separate credential or provider URL.

## SoL-Pi profile

`sol-pi.json` enables all four mechanisms:

- Action Fusion for mutation plus immediate validation in one tool observation;
- ObservationPack for bounded replay of large text observations with exact recall;
- Evidence-Preserving Reducer for eligible diagnostic output, using DeepSeek V4.1 Flash through Command Code;
- Online Context Compact for context-window/economic compaction decisions through Pi's native compaction API.

The profile is user-wide at `~/.pi/agent/sol-pi.json` inside the image. Do not duplicate it in a downstream project's `.pi/sol-pi.json` unless a project intentionally overrides the template profile and is trusted; SoL-Pi replaces rather than merges the two files.

OCC's internal progress state is only a compaction boundary signal. Continue to use pstack/Poteto as the engineering workflow and plan authority.

## Static verification

Run after changes to Docker, providers, models, subagents, pstack routing, SoL-Pi configuration, or the ownership documents:

```sh
node scripts/verify-template.mjs
```

The command requires no credentials and no network access. It validates executable configuration rather than natural-language prompt phrases. It validates the default Command Code provider, parent model qualification, subagent fallback selectors, strict model scope, supported thinking levels, and the SoL-Pi all-enabled profile including its EPR route and immutable Git pin.

## Docker verification

Build the real image after static verification:

```sh
docker build -t pi-engineering-template:pstack .
```

This catches package-version and installation incompatibilities that the static verifier cannot see.

After a Pi or SoL-Pi pin change, also confirm that `pi list --approve` reports the expected SoL-Pi Git source and that `pi --offline --approve` starts without an extension-load error. Upstream SoL-Pi treats a Pi version different from its tested release as a compatibility change, so requalify the mechanisms rather than assuming extension API compatibility.

## SoL-Pi smoke

For a SoL-Pi or Pi upgrade, exercise the mechanisms on disposable files/session data:

1. Action Fusion: run one `edit` or `write` with `then_run` and confirm the mutation and validator result are returned together.
2. ObservationPack: produce a >10 KiB text observation, advance provider turns until it is packed, and confirm `obs_recall` retrieves the original content.
3. EPR: run an eligible large diagnostic command and confirm reduction uses the configured `commandcode-goat/deepseek/deepseek-v4.1-flash` route while retaining evidence/receipt data.
4. OCC: complete a plan boundary in a long-enough disposable session and confirm compaction resumes correctly without corrupting the session/tree state.
5. Run `pstack state`, enter `/poteto-mode`, and exercise one nested workflow so SoL-Pi, pstack, subagents, and rewind behavior are checked together.

SoL-Pi session archives are operational data. Long-lived sandboxes should account for their storage growth; do not treat the archive as a credential store.

## Live model smoke

After injecting the appropriate credentials, verify model registry resolution for routes affected by the change. For the current portfolio, a useful filter is:

```sh
pi --list-models | grep -E 'openai-codex/gpt-6-astra|commandcode-goat/(deepseek/deepseek-v4.1-flash|z-ai/glm-5.3-flash|Qwen/Qwen3.8-Flash)'
```

Then make bounded one-shot calls for changed routes. Examples:

```sh
pi -p --no-tools --model 'commandcode-goat/deepseek/deepseek-v4.1-flash:low' 'Reply with exactly: DEEPSEEK_LOW_OK'
pi -p --no-tools --model 'commandcode-goat/deepseek/deepseek-v4.1-flash:high' 'Reply with exactly: DEEPSEEK_HIGH_OK'
pi -p --no-tools --model 'commandcode-goat/deepseek/deepseek-v4.1-flash:max' 'Reply with exactly: DEEPSEEK_MAX_OK'
pi -p --no-tools --model 'commandcode-goat/z-ai/glm-5.3-flash:high' 'Reply with exactly: GLM_OK'
pi -p --no-tools --model 'commandcode-goat/Qwen/Qwen3.8-Flash:xhigh' 'Reply with exactly: QWEN_OK'
pi -p --no-tools --model 'openai-codex/gpt-6-astra:medium' 'Reply with exactly: ASTRA_OK'
```

Also exercise one multi-turn, tool-using DeepSeek call. A no-tools smoke cannot verify preservation of DeepSeek reasoning state across assistant tool calls and tool results.

## Subagent routing checks

`pi-subagents` 0.66.0 supports role-level model/thinking overrides and `fallbackModels`. The committed profile uses fallbacks only for startup availability recovery. A normal retryable failure can move to the next candidate before tool activity. After tool activity, the task is not generally replayed on a second model, which preserves single-writer semantics.

Inspect the resolved runtime mapping after a routing change:

```text
/subagents-models
/subagents-models worker
/subagents-models reviewer
/subagents-models oracle
```

The expected normal path is DeepSeek for scout/researcher/worker, GLM for reviewer, and Astra for oracle.

SoL-Pi does not redefine these child roles. Ambient extension loading for delegated children remains a `pi-subagents` lifecycle/capability decision; do not widen child tools or isolation merely to force SoL-Pi into every child process.

## Pstack profile changes

`pstack-models.json` is the executable pstack role map. `/setup-pstack` is an interactive generic mapper and is not the normal maintenance path for this committed profile.

When changing routing:

1. edit `pstack-models.json` for pstack role selectors;
2. edit `settings.json` for generic subagent defaults or named overrides;
3. edit `models.json` only when the custom provider catalog, transport behavior, or thinking metadata changes;
4. edit `sol-pi.json` only when SoL-Pi feature policy, EPR reducer selection, or OCC ratio changes;
5. update `docs/model-policy.md` when the model-routing rationale changes;
6. run the static verifier.

The template intentionally has no model-routing copy in `AGENTS.md`.

## Provider failures and exclusions

Pi-subagents may temporarily exclude a failing model. This profile uses a short exclusion TTL so a transient provider or rate-limit failure does not remove a role for an extended period.

Configured `fallbackModels` provide a separate bounded startup recovery path for selected roles. Do not widen strict `modelScope` as a recovery mechanism.

If a model remains excluded after the provider is healthy, inspect pi-subagents diagnostics and restart the session if required.

EPR is a separate nested model call through the Pi registry. If the configured reducer route is unavailable, diagnose the Command Code route rather than changing subagent fallback policy; the two mechanisms have distinct ownership.

## Upgrade sequence

Upgrade one core dependency at a time unless upstream requires a coordinated bump.

1. Read the release notes and relevant open issues.
2. Update the immutable version or commit pin.
3. Run `node scripts/verify-template.mjs`.
4. Build the Docker image.
5. Smoke the affected provider/model or SoL-Pi mechanism path.
6. Exercise one nested pstack workflow if Pi, pi-subagents, pi-pstack, or SoL-Pi changed.
7. Commit the verified unit before starting the next upgrade.

For pi-pstack upgrades, review role names and selector parsing because the verifier checks role coverage and model/thinking consistency against the committed profile.

For SoL-Pi upgrades, inspect its configuration schema and Pi compatibility notes, then rerun the four-mechanism smoke. For Pi upgrades, treat SoL-Pi compatibility as part of the Pi qualification rather than as an independent afterthought.
