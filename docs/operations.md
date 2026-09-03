# Operations

## Runtime credentials

### OpenAI Codex

Authenticate Pi's `openai-codex` provider using the normal Pi/Codex login flow available in the runtime. GPT-5.6 Luna and Sol are intentionally not routed through Command Code.

### Command Code GOAT

Create a Command Code API key in Studio and inject it only at runtime:

```sh
export COMMAND_CODE_API_KEY='...'
```

`models.json` references the variable; the Dockerfile never receives the secret as an `ARG` or committed `ENV` value.

The provider always sends `x-cmd-zdr: 1`. The image also exports `CMD_ZDR=1`. Do not add a non-ZDR fallback.

## Static verification

Run before every commit that changes Docker, providers, models, subagents, or pstack routing:

```sh
node scripts/verify-template.mjs
```

The command requires no credentials and no network access.

## Docker verification

Build the real image after static verification:

```sh
docker build -t pi-engineering-template:pstack .
```

This catches package-version or installation incompatibilities that the static verifier cannot see.

## Live model smoke

After injecting the appropriate credentials, verify model registry resolution first:

```sh
pi --list-models | grep -E 'openai-codex/(gpt-5.6-luna|gpt-5.6-sol)|commandcode-goat/(deepseek/deepseek-v4-flash|z-ai/glm-5.3-flash|Qwen/Qwen3.8-Flash)'
```

Then make bounded one-shot calls for any route changed in the current patch. Use a tiny task and no tools. Examples:

```sh
pi -p --no-tools --model 'commandcode-goat/z-ai/glm-5.3-flash:high' 'Reply with exactly: GLM_OK'
pi -p --no-tools --model 'commandcode-goat/deepseek/deepseek-v4-flash:high' 'Reply with exactly: DEEPSEEK_OK'
pi -p --no-tools --model 'commandcode-goat/Qwen/Qwen3.8-Flash:xhigh' 'Reply with exactly: QWEN_OK'
```

Use equivalent small checks for Luna or Sol when their route or Pi version changes.

A Command Code `422 cmd_zdr_no_providers` is not a reason to weaken privacy policy. Record it as a capacity/coverage failure and retry later or use an already-approved non-Command-Code role where the task semantics allow it.

## Pstack profile changes

Do not use `/setup-pstack` as the normal maintenance path for this branch. It is useful for interactive generic installations, but it does not preserve this repository's curated model x thinking policy.

Change these files together:

1. `models.json` when the provider model or thinking metadata changes.
2. `settings.json` when a generic subagent role changes.
3. `pstack-models.json` when a pstack workflow role changes.
4. `docs/model-policy.md` when the rationale changes.
5. `scripts/verify-template.mjs` when an invariant changes.

Run the static verifier after every unit of change.

## Model evaluation

Before promoting a new model, run a small role-specific evaluation rather than a generic benchmark sweep.

For discovery candidates, measure whether the correct evidence is found and whether the model stops after finding enough.

For executor candidates, measure usable completed artifacts, not merely plausible partial output.

For judgment candidates, include tasks where the correct answer is "insufficient evidence" and tasks with a false premise.

For every candidate, record thinking level, wall time, provider failures, and plan/credit impact. Evaluate fan-out behavior at the concurrency the role will actually use.

## Provider failures and exclusions

Pi-subagents can temporarily exclude a failing model. This profile reduces the exclusion TTL to five minutes because a small strict portfolio should recover from transient 429/auth/provider failures quickly rather than losing a role for a day.

If a model remains excluded after the provider is healthy, inspect the pi-subagents exclusion diagnostics and restart the session if necessary. Do not widen `modelScope` to bypass a stale local exclusion.

## Upgrade sequence

Upgrade one core dependency at a time unless upstream requires a coordinated bump.

1. Read the release notes and relevant open issues.
2. Update the pin.
3. Run `node scripts/verify-template.mjs`.
4. Build the Docker image.
5. Smoke the affected provider/model path.
6. Exercise one nested pstack workflow if Pi, pi-subagents, or pi-pstack changed.
7. Commit the verified unit before starting the next upgrade.

For pi-pstack upgrades, review its role names and configuration parser. This repository depends on the current role set and on passing `provider/model:thinking` selectors through to pi-subagents.
