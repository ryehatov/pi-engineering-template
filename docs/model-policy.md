# Model and delegation policy

## Model ownership

Pi selects the parent provider and model in `settings.json`. The pstack-claude extension reads `~/.pi/agent/pstack-models.md`, injects the role policy into the system prompt, and maps the four aliases to Pi model IDs before launching a child. The override sheet is the only pstack model configuration. Do not write the old `pstack-models.json` or patch installed package skills.

| Alias | Pi model | Effort | Primary use |
| --- | --- | --- | --- |
| `opus` | `openai/gpt-6.1-sol` | xhigh | Implementation, investigation, swarm workers |
| `fable` | `openai/gpt-6-astra` | xhigh | Architecture, synthesis, hard judgments |
| `sonnet` | `anthropic/claude-opus-5-5` | high | Independent adversarial review |
| `haiku` | `anthropic/claude-sonnet-5-5` | high | Additional cross-provider review |

`arena`, `architect`, and `interrogate` use all four slots. The cross-judge pool is also diverse. All four IDs are distinct, but there are only **two providers**; two Claude models do not supply independent vendor evidence. The default parent remains Sol at `xhigh`.

## Execution and trust boundaries

- The pstack Pi extension implements `agent`, `send_message`, `list_agents`, `stop_agent`, `ask_user_question`, `schedule_wakeup`, and `/loop`. A child runs in its own Pi RPC process. The extension limits nested agent depth to three layers; it does not enforce the old `pi-subagents` allowlists or concurrency policy.
- `readonly: true` only removes Pi's `edit` and `write` tools. **It does not sandbox `bash`**. Reviewers must be instructed not to mutate files, and high-assurance isolation must come from Docker, filesystem permissions, or a separate read-only workspace.
- Writing agents should use `isolation: "worktree"` when editing in parallel. Each retained worktree needs human or supervisor review. A read-only reviewer should inspect the requested working tree if the diff is uncommitted.
- `defaultProjectTrust: "never"` keeps Pi project packages outside the automatic trust boundary. The Docker Sandbox supplies process and filesystem isolation; it does not make a third-party extension intrinsically safe.
- Credentials belong in Pi's user-managed login store, not in the image. Authentication does not establish subscription-included billing. Pi's Anthropic access can be charged per token, including every reviewer invocation. Do not fall back to a different provider without an explicit decision.

## Interaction with other extensions

Keep SoL-Pi's Action Fusion and ObservationPack enabled; EPR and OCC remain disabled. Additive Codemode preserves the native tools used by the pstack extension. pstack's `/loop` and `schedule_wakeup` provide session-scoped continuation, without a separate continuation extension. The static verifier protects this configuration but does not prove extension compatibility.
