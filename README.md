# Claude Code Status Line

## Install

```bash
bunx @nutthead/cc-statusline install
```

Use `--overwrite` to replace an existing installation.

## Configure

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline"
  }
}
```

## Logs

Execution logs are stored in `~/.local/state/statusline/app.log`.

## License

MIT
