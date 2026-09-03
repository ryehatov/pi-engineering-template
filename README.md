# pi-engineering-template

A Docker Sandbox template for rigorous Pi-based software engineering.

This branch uses `@zenspc/pi-pstack` and Poteto Mode as the engineering policy. `pi-subagents` is the execution substrate. Repository and installed engineering tools such as pi-fff and pi-lens remain available to delegated work when the agent capability allows them.

## Design

The template separates four responsibilities.

1. `@zenspc/pi-pstack` selects the engineering playbook, principles, review method, and verification discipline.
2. `pi-subagents` provides delegation, parallel fan-out, nested orchestration, worktree isolation, and execution budgets.
3. pi-fff, pi-lens, DAP, web access, Plannotator, and related extensions provide concrete engineering capabilities.
4. Docker Sandbox provides the outer isolation boundary.

The template intentionally does not define a second repository-local development lifecycle. The previous `development-loop` and `engineering-cache` skills were removed because they overlapped with pstack's playbooks, `recall`, `why`, `show-me-your-work`, and verification principles.

## Defaults

The parent Pi session uses GPT-5.6 Luna with maximum thinking. Poteto model roles are preseeded in `pstack-models.json`. High-judgment roles use GPT-5.6 Sol. Cheap exploration and swarm work use DeepSeek V4 Flash. Review diversity uses Qwen 3.8 Flash and GPT-5.6 Sol.

`worker` inherits the parent model unless pstack supplies a role-specific model. `poteto-agent` inherits ambient tools so it can use installed engineering extensions instead of being restricted to raw read/grep/find/bash/edit/write.

Nested subagent depth is `2`. This permits a top-level Poteto agent to execute pstack workflow fan-out while still bounding recursion. Per-run spawn and concurrency limits remain explicit.

## Build

```sh
docker build -t pi-engineering-template:pstack .
```

## Validate

```sh
node scripts/verify-template.mjs
```

The verifier checks the pstack dependency, pinned versions, Poteto role configuration, subagent capability boundaries, model scope, recursion/concurrency bounds, and removal of the obsolete local lifecycle.

## Runtime

Use Pi normally. Poteto Mode is available through pstack.

```text
/poteto-mode
```

The package also exposes pstack workflow skills such as `how`, `why`, `architect`, `arena`, `swarm`, `interrogate`, `reflect`, `tdd`, `deslop`, and `no-comments`.

Run `/setup-pstack` only when you want to replace the preseeded model-role mapping.

## Safety

`defaultProjectTrust` remains `never`. Model scope is enforced strictly. Destructive worktree cleanup remains automatic only within pi-subagents' managed authority policy. Scheduled runs and missions remain disabled by default.
