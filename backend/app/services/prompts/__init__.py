"""Prompt constants for Claude-driven evaluation, synthetic candidate simulation,
and other LLM call sites in RecruteTech.

Each prompt module exposes:
- `PROMPT_VERSION` (semver string) — bumped on any meaningful change.
- A `*_SYSTEM_PROMPT` string constant.
- Optionally a `*_TOOL_SCHEMA` dict for Anthropic tool_use enforcement.

Versions are persisted alongside outputs in the DB so every row is auditable
back to the exact prompt that produced it (CLAUDE.md hard rule).
"""
