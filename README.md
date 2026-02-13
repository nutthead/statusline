# statusline

Custom status line for Claude Code.

## Preview

The default theme renders a two-row status line:

```
🤖 opus-4-5          📃 09f8e582-...             🗂️ ~/a/b/statusline
🌿 main                                                        0.38%
```

- **Row 1** (left to right):
  - 🤖 Model ID (abbreviated)
  - 📃 Session ID (first 8 characters)
  - 🗂️ Project directory (compressed and telescoped)

- **Row 2** (left to right):
  - 🌿 Git branch name (or 🪾 commit hash if detached, 💾 if not a repo, 💥 on error)
  - Context window usage percentage

## Install

```bash
bunx @nutthead/cc-statusline install
```

Then add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline"
  }
}
```

Use `--overwrite` to replace an existing installation.

## Custom Themes

Create a JS file that default-exports a theme function (e.g. `~/.config/cc-statusline/theme.js`):

```js
export default function theme(input) {
  if (!input) return "";

  const status = JSON.parse(input);
  const dir = status.workspace.current_dir;
  const model = status.model.display_name;
  const ctx = status.context_window.used_percentage ?? 0;

  return `${model} | ${dir} | ctx: ${Math.round(ctx)}%`;
}
```

Then point to it in `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline --theme ~/.config/cc-statusline/theme.js"
  }
}
```

## Available Fields

The JSON object passed to your theme function contains these fields:

| Field                            | Example                  |
| -------------------------------- | ------------------------ |
| `session_id`                     | `"f9abcdef-1a2b-..."`    |
| `version`                        | `"2.1.39"`               |
| `model.id`                       | `"claude-opus-4-6"`      |
| `model.display_name`             | `"Claude Opus 4.6"`      |
| `workspace.current_dir`          | `"/home/user/project"`   |
| `workspace.project_dir`          | `"/home/user/project"`   |
| `context_window.used_percentage` | `42.5`                   |
| `context_window.vim.mode`        | `"INSERT"` or `"NORMAL"` |
| `context_window.agent.name`      | `"claude-code"`          |

See [`src/schema/statusLine.ts`](src/statusLineSchema.ts) for the full schema.

## Troubleshooting

Execution logs are stored in `~/.local/state/statusline/app.log`.

## License

MIT
