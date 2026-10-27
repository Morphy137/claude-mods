# claude-mods

Mods (plugins) for Claude Code and the Claude desktop app. Each mod lives in its own folder and is listed in `.claude-plugin/marketplace.json`.

| Mod | Description |
| --- | --- |
| [agent-dashboard](./agent-dashboard) | Worker pane and animated pixel-art mascot band showing running subagents, their files and estimated cost. |

## Install from GitHub

```bash
claude plugin marketplace add Morphy137/claude-mods
claude plugin install agent-dashboard@morphy-mods
```

Toggle it from **Customize → Plugins** in the desktop app, or:

```bash
claude plugin disable agent-dashboard@morphy-mods
claude plugin enable agent-dashboard@morphy-mods
```

## Develop locally

```bash
claude plugin marketplace add "<path to this folder>"
claude plugin install agent-dashboard@morphy-mods
```

Validate and test a mod:

```bash
claude plugin validate agent-dashboard
claude plugin test agent-dashboard
```

## Add a new mod

1. Create `<mod-name>/.claude-plugin/plugin.json` and `<mod-name>/hooks/`.
2. Add an entry to `.claude-plugin/marketplace.json`.
