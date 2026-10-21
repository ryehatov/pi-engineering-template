# pstack model configuration — Pi
# All default subagents use OpenAI; Anthropic needs separately authorized extra usage.

pi models: opus=openai/gpt-6.1-sol, fable=openai/gpt-6-astra, sonnet=openai/gpt-6-sol, haiku=openai/gpt-6-luna

feature, refactoring: opus
bug-fix: opus
perf-issue: fable
hillclimb: fable
judgment and prose: opus
strongest judgment: fable
how explorer: opus
how explainer: fable
why investigators: opus
why synthesizer: fable
reflect tooling: opus
reflect judgment, divergent, synthesizer: fable
arena runners: opus, fable, sonnet @high, haiku @high
arena cross-judge pool: opus, fable, sonnet @high, haiku @high
swarm workers: opus
architect runners: opus, fable, sonnet @high, haiku @high
interrogate reviewers: opus, fable, sonnet @high, haiku @high

default effort: xhigh
session hook: on
