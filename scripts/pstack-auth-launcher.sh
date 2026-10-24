#!/bin/sh
# Docker Sandbox injects ANTHROPIC_API_KEY into each exec, shadowing Claude OAuth.
unset ANTHROPIC_API_KEY
name=${0##*/}
case "$0" in
  */*) exec "$0.pstack-upstream" "$@" ;;
  *) exec "$(command -v "$name").pstack-upstream" "$@" ;;
esac
