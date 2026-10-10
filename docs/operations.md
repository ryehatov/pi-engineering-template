# Operations

## Logins

Start Pi and use `/login openai` -> **Sign in with ChatGPT**. This consumes the OpenAI subscription. Start the installed `claude` CLI inside the sandbox, as user `agent`, and complete its normal Claude Pro login. Inspect/approve the CLI's user-level settings and hooks; the read-only adapter excludes project settings and MCP. Do not set `ANTHROPIC_API_KEY` for this subscription-only profile.

`@narumitw/pi-accounts` can manage named Pi OAuth accounts; it does not switch Claude Code's login. Mount credential files separately rather than masking all of `~/.pi/agent`.

## Build and static checks

```sh
node scripts/verify-template.mjs
docker build -t pi-engineering-template:pstack .
```

Static checks detect stale model IDs, pins, routing tags, tool-policy drift and old transports. They do NOT establish Docker-build compatibility, OAuth success or runtime tool availability.

## Live smoke after login

```sh
pi --list-models | grep -E 'gpt-6\.1-sol|gpt-6-astra'
pi -p --no-tools --model 'openai/gpt-6.1-sol:xhigh' 'Reply exactly SOL_OK'
pi -p --no-tools --model 'openai/gpt-6-astra:xhigh' 'Reply exactly ASTRA_OK'
claude --version
claude -p --model claude-opus-5-5 --effort high 'Reply exactly OPUS_OK'
claude -p --model claude-sonnet-5-5 --effort high 'Reply exactly SONNET_OK'
claude -p --model claude-haiku-5-5 --effort medium 'Reply exactly HAIKU_OK'
```

Run `/subagents-models` and inspect `worker`, `researcher`, `reviewer`, `oracle`, and `claude-code`. Launch a native worker and verify its `edit/write/bash`, active FFF and Pi-Lens capabilities. Launch `scout`, `reviewer`, and `oracle` to inspect a disposable diff; verify `watchdog_diff` and source reading work without nonexistent optional tools. Launch `researcher` and confirm its Web/source-check tools. Do not assume the FFF index or lazy Pi-Lens tools are active before they register.

For independent review, use `subagent({agent:"claude-code",model:"claude-opus-5-5:high",async:true,task:"FULL DIFF, RUBRIC, TEST EVIDENCE"})`. The adapter is read-only **and has no file tools**, so include actual source and diff text. Pstack `interrogate` and `arena` use the same bridge after the Docker patch. Run a second Sonnet `high` review only when a second judgment is useful. Do not silently reroute on subscription quota failures.

## SoL-Pi qualification

SoL-Pi's tested Pi baseline is 0.85.1, older than this image's Pi 1.1.0. In the built sandbox verify `pi list --approve` and offline startup without extension errors, then exercise Action Fusion (edit/write + `then_run`), ObservationPack + exact `obs_recall`, one nested pstack/Poteto worker, and one independent Claude audit. Until then the combination is **not runtime-qualified**.

Start with `/pstack status`, activate `/poteto-mode` and optionally `/goal <objective>`. Default subagent context is fresh, concurrency finite, missions/schedules disabled and auto provider fallback unset.
