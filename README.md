# Claude Code Status Line

To install dependencies:

```bash
bun install
```

To build:

```bash
bun run build:binary
```

To copy to `~/.claude`:

```bash
bun run install
```

## Configure your Claude Code's statusline

Edit your `~/.claude/settings.json` file to include:

```json
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/.claude/statusline",
    "padding": 0
  }
}
```

## Logs

Execution logs are stored in `~/.local/state/statusline/app.log`.

## License

MIT
