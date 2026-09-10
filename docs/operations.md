# Operations

## Session startup

The normal interactive startup routine is:

```text
pstack state
/poteto-mode
```

This is operator state. Once Poteto Mode is active, pstack supplies its workflow context directly; no repository-global prompt is required to restate it.

## Runtime credentials

### OpenAI Codex

Authenticate Pi's `openai-codex` provider using the normal Pi/Codex login flow available in the runtime. This route is used for bounded Astra oracle and escalation calls.

### Command Code GOAT

Create a Command Code API key in Studio and inject it only at runtime:

```sh
export COMMAND_CODE_API_KEY='...'
```

`models.json` references the variable; the Dockerfile never receives the secret as an `ARG` or committed `ENV` value. The provider also sends `x-cmd-zdr: 1`. A request must therefore use a ZDR-capable upstream or fail closed.

## Static verification

Run after changes to Docker, providers, models, subagents, pstack routing, or the ownership documents:

```sh
node scripts/verify-template.mjs
```

The command requires no credentials and no network access. It validates executable configuration rather than natural-language prompt phrases. It also validates the Command Code ZDR header, parent model qualification, subagent fallback selectors, strict model scope, and supported thinking levels.

## Docker verification

Build the real image after static verification:

```sh
docker build -t pi-engineering-template:pstack .
```

This catches package-version and installation incompatibilities that the static verifier cannot see.

## Live model smoke

After injecting the appropriate credentials, verify model registry resolution for routes affected by the change. For the current portfolio, a useful filter is:

```sh
pi --list-models | grep -E 'openai-codex/gpt-6-astra|commandcode-goat/(deepseek/deepseek-v4-flash|z-ai/glm-5.3-flash|Qwen/Qwen3.8-Flash)'
```

Then make bounded one-shot calls for changed routes. Examples:

```sh
pi -p --no-tools --model 'commandcode-goat/deepseek/deepseek-v4-flash:low' 'Reply with exactly: DEEPSEEK_LOW_OK'
pi -p --no-tools --model 'commandcode-goat/deepseek/deepseek-v4-flash:high' 'Reply with exactly: DEEPSEEK_HIGH_OK'
pi -p --no-tools --model 'commandcode-goat/deepseek/deepseek-v4-flash:max' 'Reply with exactly: DEEPSEEK_MAX_OK'
pi -p --no-tools --model 'commandcode-goat/z-ai/glm-5.3-flash:high' 'Reply with exactly: GLM_OK'
pi -p --no-tools --model 'commandcode-goat/Qwen/Qwen3.8-Flash:xhigh' 'Reply with exactly: QWEN_OK'
pi -p --no-tools --model 'openai-codex/gpt-6-astra:medium' 'Reply with exactly: ASTRA_OK'
```

Also exercise one tool-using DeepSeek call. A no-tools smoke cannot verify multi-turn tool-call compatibility.

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

## Pstack profile changes

`pstack-models.json` is the executable pstack role map. `/setup-pstack` is an interactive generic mapper and is not the normal maintenance path for this committed profile.

When changing routing:

1. edit `pstack-models.json` for pstack role selectors;
2. edit `settings.json` for generic subagent defaults or named overrides;
3. edit `models.json` only when the custom provider catalog, transport policy, or thinking metadata changes;
4. update `docs/model-policy.md` when the rationale changes;
5. run the static verifier.

The template intentionally has no model-routing copy in `AGENTS.md`.

## Provider failures and exclusions

Pi-subagents may temporarily exclude a failing model. This profile uses a short exclusion TTL so a transient provider or rate-limit failure does not remove a role for an extended period.

Configured `fallbackModels` provide a separate bounded startup recovery path for selected roles. Do not widen strict `modelScope` as a recovery mechanism.

If a model remains excluded after the provider is healthy, inspect pi-subagents diagnostics and restart the session if required.

## Upgrade sequence

Upgrade one core dependency at a time unless upstream requires a coordinated bump.

1. Read the release notes and relevant open issues.
2. Update the version pin.
3. Run `node scripts/verify-template.mjs`.
4. Build the Docker image.
5. Smoke the affected provider/model path.
6. Exercise one nested pstack workflow if Pi, pi-subagents, or pi-pstack changed.
7. Commit the verified unit before starting the next upgrade.

For pi-pstack upgrades, review role names and selector parsing because the verifier checks role coverage and model/thinking consistency against the committed profile.
