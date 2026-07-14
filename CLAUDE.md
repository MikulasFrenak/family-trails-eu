@AGENTS.md

# Claude Code addendum

Everything else — repo layout, branching/commits, capabilities, public-repo hygiene — lives in [`AGENTS.md`](./AGENTS.md) above. This file only adds mechanics specific to Claude Code itself.

## Skill Invocation Policy

Capabilities live as reference implementations in [`ai-delivery-playbook/skills/`](https://github.com/MikulasFrenak/ai-delivery-playbook/tree/main/skills). Copy the ones you want into `.claude/skills/` here as you need them.

**Never auto-invoke a skill from its description alone** — every skill in the playbook sets `disable-model-invocation: true` on purpose. A skill only runs when explicitly invoked via its slash command.

## Settings

If `.claude/settings.json` exists and is shared/committed, put local-only additions (auto-approved permissions, model overrides) in `.claude/settings.local.json` instead.
