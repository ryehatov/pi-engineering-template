# Operations

## Native subscription authentication

Start Pi and use `/login openai` -> **Sign in with ChatGPT** for the OpenAI subscription. Run `/login anthropic` for the native Anthropic OAuth flow. Both credentials are managed by Pi in `~/.pi/agent/auth.json`; no external Claude Code CLI is required. OAuth through a third-party client is not proof of subscription-included billing: confirm Anthropic's current entitlement and billing rules.

Do not accidentally supply an `ANTHROPIC_API_KEY` as an API-billing credential when intending subscription OAuth. Credential resolution should be confirmed with the selected provider and `/model` (Pi prefers stored OAuth credentials to environment API keys). `@narumitw/pi-accounts` manages named Pi accounts; it does not need a special Claude Code bridge.

## Static and Docker checks

```sh
node scripts/verify-template.mjs
node --test scripts/verify-template.test.mjs
docker build -t pi-engineering-template:pstack .
```

Static checks enforce immutable pins, Pi 1.3 schema, additive Codemode, bounded async capacity, role IDs, native provider scopes, direct research Web tools and absence of retired external runners. They cannot establish login success, Docker build compatibility or tool availability.

## Live smoke after login

```sh
pi --version  # expect 1.3.0
pi --list-models | grep -E 'openai/gpt-6\\.1-sol|openai/gpt-6-astra|anthropic/claude-(opus|sonnet|haiku)-5-5'
pi -p --no-tools --model 'openai/gpt-6.1-sol:xhigh' 'Reply exactly SOL_OK'
pi -p --no-tools --model 'openai/gpt-6-astra:xhigh' 'Reply exactly ASTRA_OK'
pi -p --no-tools --model 'anthropic/claude-opus-5-5:high' 'Reply exactly OPUS_OK'
pi -p --no-tools --model 'anthropic/claude-sonnet-5-5:high' 'Reply exactly SONNET_OK'
pi -p --no-tools --model 'anthropic/claude-haiku-5-5:medium' 'Reply exactly HAIKU_OK'
```

Inspect `/subagents-models` and the resolved `reviewer`, `worker`, `researcher` and `oracle` mappings. Launch `subagent({agent:"reviewer",model:"anthropic/claude-opus-5-5:high",task:"Review this diff and inspect relevant files"})` and confirm native `read/grep` and `watchdog_diff` work. Interrogate/Arena should use Opus and Sonnet as native reviewers, without CLI processes. Confirm workers can edit, test and access registered FFF/Pi-Lens tools. Check researcher Web tools and scout exploration without conditionally registered startup names. Exercise pstack `why`, `reflect`, and `arena` with Astra-selected workers to verify strict model-scope routing.

## SoL-Pi and Pi 1.3 qualification

The pinned SoL-Pi commit includes upstream Pi 1.3.0 tests for all four mechanisms and Codemode. This does not prove compatibility of the complete Docker extension portfolio. In the actual sandbox confirm `pi list --approve`, offline startup, no extension-load errors, and that Codemode leaves native tools available. Exercise Action Fusion (including failing `then_run`), ObservationPack + `obs_recall`, nested Poteto workers, direct `researcher` Web tools, native Claude review, and resumed subagent tool activation. `pi-context-view` should not issue a silent synthetic probe before a real request.

At startup inspect `/pstack status`, activate `/poteto-mode` and optionally use `/goal <objective>`. Subagent context is fresh; active parent async runs are capped at 4, cumulative session spawns at 128, global child concurrency at 8, and spawns per run at 32. Missions/schedules remain disabled and no automatic provider fallback is configured.
