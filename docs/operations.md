# Operations

## Native subscription authentication

Start Pi and use `/login openai` -> **Sign in with ChatGPT** for the OpenAI subscription. Run `/login anthropic` for the Claude Pro/Max subscription. Both are Pi-native credentials stored in `~/.pi/agent/auth.json`; there is no separate Claude Code CLI account or executable to install.

Do not accidentally supply an `ANTHROPIC_API_KEY` as an API-billing credential when intending subscription OAuth. Credential resolution should be confirmed with the selected provider and `/model` (Pi prefers stored OAuth credentials to environment API keys). `@narumitw/pi-accounts` manages named Pi accounts; it does not need a special Claude Code bridge.

## Static and Docker checks

```sh
node scripts/verify-template.mjs
node --test scripts/verify-template.test.mjs
docker build -t pi-engineering-template:pstack .
```

Static checks enforce immutable pins, role IDs, native provider scopes and absence of retired external runners. They cannot establish login success, Docker build compatibility or tool availability.

## Live smoke after login

```sh
pi --list-models | grep -E 'openai/gpt-6\\.1-sol|openai/gpt-6-astra|anthropic/claude-(opus|sonnet|haiku)-5-5'
pi -p --no-tools --model 'openai/gpt-6.1-sol:xhigh' 'Reply exactly SOL_OK'
pi -p --no-tools --model 'openai/gpt-6-astra:xhigh' 'Reply exactly ASTRA_OK'
pi -p --no-tools --model 'anthropic/claude-opus-5-5:high' 'Reply exactly OPUS_OK'
pi -p --no-tools --model 'anthropic/claude-sonnet-5-5:high' 'Reply exactly SONNET_OK'
pi -p --no-tools --model 'anthropic/claude-haiku-5-5:medium' 'Reply exactly HAIKU_OK'
```

Inspect `/subagents-models` and the resolved `reviewer`, `worker`, `researcher` and `oracle` mappings. Launch `subagent({agent:"reviewer",model:"anthropic/claude-opus-5-5:high",task:"Review this diff and inspect relevant files"})` and confirm native `read/grep` and `watchdog_diff` work. Interrogate/Arena should use Opus and Sonnet as native reviewers, without CLI processes. Confirm workers can edit, test and access registered FFF/Pi-Lens tools. Check researcher Web tools and scout exploration without conditionally registered startup names. Exercise pstack `why`, `reflect`, and `arena` with Astra-selected workers to verify strict model-scope routing.

## SoL-Pi qualification

SoL-Pi's tested Pi baseline remains 0.85.1. In the actual Docker sandbox confirm `pi list --approve`, offline startup and no extension-load errors. Exercise Action Fusion (edit/write + `then_run`), ObservationPack + `obs_recall`, one nested Poteto worker and one independent native Claude review. Treat the Pi 1.1.0 integration as unqualified until this passes.

At startup inspect `/pstack status`, activate `/poteto-mode` and optionally use `/goal <objective>`. Subagent context is fresh by default, concurrency is bounded, missions/schedules are disabled and there is no automatic provider fallback.
