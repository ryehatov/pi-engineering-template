# Model and delegation policy

## Model ownership

Pi selects the parent provider and model in `settings.json`. The pstack-claude extension reads `~/.pi/agent/pstack-models.md`, injects the role policy into the system prompt, and maps the four aliases to Pi model IDs before launching a child. The override sheet is the only pstack model configuration. Do not write the old `pstack-models.json` or patch installed package skills.

| Alias | Pi model | Effort | Primary use |
| --- | --- | --- | --- |
| `opus` | `openai/gpt-6.1-sol` | xhigh | Implementation, investigation, swarm workers |
| `fable` | `openai/gpt-6-astra` | xhigh | Architecture, synthesis, hard judgments |
| `sonnet` | `openai/gpt-6-sol` | high | Alternative-model adversarial review |
| `haiku` | `openai/gpt-6-luna` | high | Additional lightweight review |

`arena`, `architect`, and `interrogate` use all four slots. The cross-judge pool also uses these four model IDs. They are distinct but run on **one provider**. Distinct models can reduce shared blind spots, but this panel provides **no cross-vendor independence**. The `sonnet` and `haiku` labels are pstack family aliases, not Claude endpoints. The default parent remains Sol at `xhigh`.

## Execution and trust boundaries

- The pstack Pi extension implements `agent`, `send_message`, `list_agents`, `stop_agent`, `ask_user_question`, `schedule_wakeup`, and `/loop`. A child runs in its own Pi RPC process. The extension limits nested agent depth to three layers; it does not enforce the old `pi-subagents` allowlists or concurrency policy.
- `readonly: true` only removes Pi's `edit` and `write` tools. **It does not sandbox `bash`**. Reviewers must be instructed not to mutate files, and high-assurance isolation must come from Docker, filesystem permissions, or a separate read-only workspace.
- Writing agents should use `isolation: "worktree"` when editing in parallel. Each retained worktree needs human or supervisor review. A read-only reviewer should inspect the requested working tree if the diff is uncommitted.
- `defaultProjectTrust: "never"` keeps Pi project packages outside the automatic trust boundary. The Docker Sandbox supplies process and filesystem isolation; it does not make a third-party extension intrinsically safe.
- Credentials belong in Pi's user-managed login store, not in the image. Authentication does not establish subscription-included billing. Anthropic OAuth in a third-party Pi client may be blocked with HTTP 400 until separately funded extra usage is enabled. The default image deliberately avoids this dependency. Do not fall back to a different provider without an explicit decision.

## Optional cross-provider review

Only enable Anthropic when its account explicitly permits and funds third-party requests. In a local `~/.pi/agent/pstack-models.md` override, change `sonnet` and `haiku` to approved Anthropic `<provider>/<model-id>` values and confirm each model with a small live request before a multi-agent run. This is a deliberate deviation from the default OpenAI-only template policy; the static verifier will reject it. Keep billing credentials out of Git and Docker image layers. Do not treat a Claude subscription login as proof that extra usage is available.

## Performance and operational limits

Pstack's Pi extension starts a separate RPC process for each delegated agent. Its built-in three-layer depth limit is **not** a global concurrency cap. For large swarms and arena runs, choose a bounded number of workers appropriate to the available CPU, memory, and model quota; review results before expanding the fan-out. Do not assume that a role-only or read-only prompt is an enforcement boundary.

The four-model panel and `xhigh` default are deliberate quality-oriented settings, not a measured optimum for latency or cost. Keep model diversity for security reviews; tune individual roles only after measuring representative workloads. The small `pstack-models.md` sheet is injected into agent context, so detailed rationale belongs in this document instead of the runtime sheet.

## Interaction with other extensions

Keep SoL-Pi's Action Fusion and ObservationPack enabled; EPR and OCC remain disabled. Additive Codemode preserves the native tools used by the pstack extension. pstack's `/loop` and `schedule_wakeup` provide session-scoped continuation, without a separate continuation extension. The static verifier protects this configuration but does not prove extension compatibility.
