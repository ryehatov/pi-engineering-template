#!/bin/sh
# Docker Sandbox may inject ANTHROPIC_API_KEY=proxy-managed for every exec.
# Keep Pi's Claude Code transport on a separate Claude subscription login.
set -eu

name=${0##*/}
case "$name" in
  pi|claude) ;;
  *) printf 'pstack: unsupported launcher: %s\n' "$name" >&2; exit 64 ;;
esac

# Only discard the Docker proxy placeholder. Preserve real overrides so the
# Claude subscription transport can reject them instead of silently rebilling.
if [ "${ANTHROPIC_API_KEY-}" = 'proxy-managed' ]; then unset ANTHROPIC_API_KEY; fi
if [ "${ANTHROPIC_AUTH_TOKEN-}" = 'proxy-managed' ]; then unset ANTHROPIC_AUTH_TOKEN; fi
if [ "${ANTHROPIC_BASE_URL-}" = 'proxy-managed' ]; then unset ANTHROPIC_BASE_URL; fi
if [ "${ANTHROPIC_FOUNDRY_API_KEY-}" = 'proxy-managed' ]; then unset ANTHROPIC_FOUNDRY_API_KEY; fi

# Do not inherit the sandbox's ~/.claude/settings.json: older sandboxes may
# install an apiKeyHelper that returns proxy-managed and shadows OAuth login.
# Both the interactive Claude CLI and pi-claude-code use the same private home.
: "${HOME:?pstack: HOME must be set for Claude subscription credentials}"
PI_CLAUDE_CODE_CONFIG_DIR=${PI_CLAUDE_CODE_CONFIG_DIR:-"$HOME/.config/pstack/claude"}
case "$PI_CLAUDE_CODE_CONFIG_DIR" in
  /*) ;;
  *) printf 'pstack: PI_CLAUDE_CODE_CONFIG_DIR must be absolute\n' >&2; exit 78 ;;
esac
export PI_CLAUDE_CODE_CONFIG_DIR
CLAUDE_CONFIG_DIR=$PI_CLAUDE_CODE_CONFIG_DIR
export CLAUDE_CONFIG_DIR

if [ "$name" = 'claude' ]; then
  # The host proxy can substitute an Anthropic API key even after the
  # placeholder is removed. Fail closed on API-key/unknown billing modes.
  case "${SBX_CRED_ANTHROPIC_MODE:-none}" in
    none|oauth) ;;
    *) printf 'pstack: Docker Sandbox Anthropic credential mode "%s" is not safe for Claude subscription use (expected none or oauth). Remove the host Anthropic API key or use a subscription-only sandbox.\n' "${SBX_CRED_ANTHROPIC_MODE}" >&2; exit 78 ;;
  esac
  if [ -n "${ANTHROPIC_API_KEY-}" ] || [ -n "${ANTHROPIC_AUTH_TOKEN-}" ] || \
     [ -n "${ANTHROPIC_BASE_URL-}" ] || [ -n "${ANTHROPIC_FOUNDRY_API_KEY-}" ]; then
    printf 'pstack: Claude subscription use requires no Anthropic API-key, auth-token, or base-URL overrides\n' >&2
    exit 78
  fi
  for flag in "${CLAUDE_CODE_USE_BEDROCK-}" "${CLAUDE_CODE_USE_VERTEX-}" "${CLAUDE_CODE_USE_FOUNDRY-}"; do
    # Match the upstream bridge's truthy-flag semantics.
    disabled=$(printf '%s' "$flag" | tr '[:upper:]' '[:lower:]')
    case "$disabled" in
      ''|0|false|no|off) ;;
      *) printf 'pstack: Claude subscription use rejects Bedrock, Vertex, and Foundry backend overrides\n' >&2; exit 78 ;;
    esac
  done
fi

# Docker installs the real npm shims next to these wrappers as .pstack-upstream.
# Exec (rather than spawn) preserves exit codes, signals, TTY, and stdin/stdout.
case "$0" in
  */*) original="$0.pstack-upstream" ;;
  *) original="$(command -v "$name").pstack-upstream" ;;
esac
if [ ! -x "$original" ]; then
  printf 'pstack: missing original %s executable: %s\n' "$name" "$original" >&2
  exit 70
fi
exec "$original" "$@"
