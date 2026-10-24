# Model and delegation policy

## Model ownership

Pi selects the parent provider and model in `settings.json`. The pstack-claude extension reads `~/.pi/agent/pstack-models.md`, injects the role policy into the system prompt, and maps the four aliases to Pi model IDs before launching a child. The override sheet is the only pstack model configuration. Do not write the old `pstack-models.json` or patch installed package skills.

| Alias | Pi model | Effort | Primary use |
| --- | --- | --- | --- |
| `opus` | `openai/gpt-6.1-sol` | xhigh | Implementation, investigation, swarm workers |
| `fable` | `openai/gpt-6-astra` | xhigh | Architecture, synthesis, hard judgments |
| `sonnet` | `claude-code/claude-opus-5-5` | high | Independent adversarial review through Claude Code CLI |
| `haiku` | `claude-code/claude-sonnet-5-5` | high | Additional Claude review through Claude Code CLI |

`arena`, `architect`, and `interrogate` use all four slots. The cross-judge pool is also diverse. All four IDs are distinct, but there are only **two Pi providers** (`openai` and `claude-code`) and **two model vendors**. Two Claude models do not supply independent vendor evidence. The default parent remains Sol at `xhigh`.

## Execution and trust boundaries

- The pstack Pi extension implements `agent`, `send_message`, `list_agents`, `stop_agent`, `ask_user_question`, `schedule_wakeup`, and `/loop`. A child runs in its own Pi RPC process. The extension limits nested agent depth to three layers; it does not enforce the old `pi-subagents` allowlists or concurrency policy.
- `readonly: true` only removes Pi's `edit` and `write` tools. **It does not sandbox `bash`**. Reviewers must be instructed not to mutate files, and high-assurance isolation must come from Docker, filesystem permissions, or a separate read-only workspace.
- Writing agents should use `isolation: "worktree"` when editing in parallel. Each retained worktree needs human or supervisor review. A read-only reviewer should inspect the requested working tree if the diff is uncommitted.
- `defaultProjectTrust: "never"` keeps Pi project packages outside the automatic trust boundary. The Docker Sandbox supplies process and filesystem isolation; it does not make a third-party extension intrinsically safe.
- The `claude-code` provider uses the installed official Claude Code CLI and its own subscription credentials, not Pi's built-in `/login anthropic`. The installed `pi` and `claude` launch shims strip only Docker's `proxy-managed` Anthropic placeholders and force a dedicated shared Claude Code config home (`~/.config/pstack/claude`, or absolute `PI_CLAUDE_CODE_CONFIG_DIR`), avoiding legacy `apiKeyHelper` overrides in `~/.claude/settings.json`. Host proxy mode `apikey`, real auth/backend overrides, and unrecognized sandbox credential modes are rejected for Claude. This protects against accidental API billing but does not prove how Anthropic ultimately meters a valid request. Keep credentials in the runtime home, not in image layers. Confirm the account with `claude auth status`. Do not enable usage-credit charging without explicit consent.
- The experimental bridge checks Claude Code rate-limit events and fails the current call when extra usage is detected unless `PI_CLAUDE_CODE_ALLOW_USAGE_CREDITS=1`; **the triggering request may already be billed**. Keep the flag unset and disable extra usage in Claude settings when plan-only usage is required. No runtime can guarantee provider-side classification. See [operations](operations.md#claude-code-subscription-transport).
- The bridge forwards authenticated requests through a loopback relay. The bridge may simplify complex tool schemas, and known open issues affect tree summaries, cross-provider history replay, and dropped-stream retry semantics. Test a fresh Claude child before any full review. Do not use request-header spoofing or ad-hoc OAuth workarounds.

## Performance and operational limits

Pstack's Pi extension starts a separate RPC process for each delegated agent. Its built-in three-layer depth limit is **not** a global concurrency cap. For large swarms and arena runs, choose a bounded number of workers appropriate to the available CPU, memory, and model quota; review results before expanding the fan-out. Do not assume that a role-only or read-only prompt is an enforcement boundary.

The four-model panel and `xhigh` default are deliberate quality-oriented settings, not a measured optimum for latency or cost. Keep model diversity for security reviews; tune individual roles only after measuring representative workloads. The small `pstack-models.md` sheet is injected into agent context, so detailed rationale belongs in this document instead of the runtime sheet.

## Interaction with other extensions

Keep SoL-Pi's Action Fusion and ObservationPack enabled; EPR and OCC remain disabled. Additive Codemode preserves the native tools used by the pstack extension. pstack's `/loop` and `schedule_wakeup` provide session-scoped continuation, without a separate continuation extension. The static verifier protects this configuration but does not prove extension compatibility.
