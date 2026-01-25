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

### Custom Theme

1. Create a directory for the custom theme:

   ```bash
   mkdir ~/.config/cc-statusline
   ```

2. Write a custom theme (e.g. in `~/.config/cc-statusline/theme.js`)

   ```js
   export default function theme(input) {
     if (input) {
       // parse input
       const json = JSON.parse(input);

       // construct status line
       const statusLine = "...";

       // return status line
       return statusLine;
     } else {
       return "";
     }
   }
   ```

3. Configure Claude Code

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "~/.claude/statusline --theme ~/.config/cc-statusline/theme.js"
     }
   }
   ```

## Logs

Execution logs are stored in `~/.local/state/statusline/app.log`.

## License

MIT
