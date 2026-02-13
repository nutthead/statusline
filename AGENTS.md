# AGENTS.md

This document provides essential information for AI coding agents working on the `@nutthead/cc-statusline` project.

## Project Overview

**@nutthead/cc-statusline** is a custom status line for Claude Code. It reads JSON status data from stdin, formats it using a theme function, and outputs a human-readable status line.

The project is published on npm as `@nutthead/cc-statusline` and provides both:

- A CLI tool for installing the status line binary
- A runtime binary that formats and displays the status line

## Technology Stack

- **Runtime**: Bun (>=1.3.3)
- **Language**: TypeScript (ESNext, strict mode)
- **Package Manager**: Bun (uses `bun.lock`)
- **Linting/Formatting**: Biome
- **Task Runner**: Just
- **Testing**: Bun's built-in test runner (`bun:test`)

## Key Dependencies

| Package                              | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| `@logtape/logtape` + `@logtape/file` | Structured file logging                 |
| `ansi-colors`                        | Terminal color output                   |
| `meow`                               | CLI argument parsing                    |
| `neverthrow`                         | Type-Safe Errors for JS & TypeScript    |
| `simple-git`                         | Git operations for branch detection     |
| `ts-pattern`                         | Exhaustive pattern matching             |
| `zod`                                | Schema validation for status line input |

## Project Structure

```
.
├── index.ts              # Main entry point: reads stdin, applies theme, outputs status
├── src/
│   ├── cli.ts            # CLI entry point for `install` command
│   ├── statusLineSchema.ts    # Zod schema for Claude Code status JSON
│   ├── themes/
│   │   └── defaultTheme.ts    # Default two-row status line theme
│   ├── theme/
│   │   └── loadTheme.ts       # Dynamic theme loader (supports custom themes)
│   ├── utils.ts          # Path/model abbreviation, git status helpers
│   └── logging.ts        # LogTape configuration
├── test/
│   └── setup.ts          # Test preloader (mocks file logging, homedir)
├── fixtures/             # JSON fixtures for testing
├── bin/                  # Compiled CLI output (gitignored)
└── target/               # Compiled binary output (gitignored)
```

## Dual Entry Points

The project has two distinct entry points:

1. **`index.ts`** — Bun binary entry point
   - Reads JSON from `Bun.stdin`
   - Applies theme function (default or custom via `--theme`)
   - Outputs formatted status line to stdout
   - Compiled to standalone binary at `target/statusline`

2. **`src/cli.ts`** — Node CLI entry point (`bin/cc-statusline.js`)
   - Provides the `install` command
   - Builds the binary and copies it to `~/.claude/`
   - What npm users invoke via `bunx @nutthead/cc-statusline install`

## Build Commands

```bash
# Build standalone binary to target/statusline
bun run build:binary

# Build CLI for npm distribution to bin/cc-statusline.js
bun run build:cli

# Install binary to ~/.claude/
bun run install:binary

# Format + lint + build + install (via just)
just build
```

## Testing

Tests are co-located with source files using the pattern `*.test.ts`.

```bash
# Run all tests
bun test

# Run a specific test file
bun test src/utils.test.ts

# Run with watch mode
bun test --watch
```

### Test Setup

The `bunfig.toml` preloads `test/setup.ts` before running tests:

- Mocks `@logtape/file` to suppress file I/O
- Mocks `node:os` homedir to return `/home/testuser`

### Testing Patterns

- Use `bun:test` for imports (`describe`, `test`, `expect`, `mock`, `spyOn`, etc.)
- Tests use actual git operations against temporary directories where appropriate
- Fixture files in `fixtures/` are used for integration testing themes

## Code Style Guidelines

### Biome Configuration

- **Formatter**: Enabled, 2-space indentation
- **Quotes**: Double quotes for JavaScript
- **Linter**: Enabled with recommended rules
- **Organize Imports**: Enabled (automatically sorts and deduplicates)
- **VCS Integration**: Enabled, respects `.gitignore`

### Commands

```bash
# Format all files
bun run biome:format

# Lint and auto-fix
bun run biome:lint

# Via just
just biome-format
just biome-lint
```

### TypeScript Conventions

- Strict mode enabled
- `noUncheckedIndexedAccess: true` — always handle undefined for index access
- `verbatimModuleSyntax: true` — use `import type` for type imports
- `noEmit: true` — Bun handles TypeScript directly

### Naming & Style

- Functions use camelCase
- Types/interfaces use PascalCase
- Files use camelCase (except entry points)
- Prefer async/await over raw promises
- Use `ts-pattern` for exhaustive pattern matching

## Custom Themes

Users can provide custom themes via `--theme <path>`:

```typescript
// Theme function signature
type ThemeFunction = (input?: string) => Promise<string>;

// Example theme at ~/.config/cc-statusline/theme.js
export default function theme(input?: string) {
  if (!input) return "";
  const status = JSON.parse(input);
  return `${status.model.display_name} | ${status.workspace.current_dir}`;
}
```

Theme paths support `~` expansion to the user's home directory.

## Status Line Schema

Claude Code sends a JSON object with the following structure (see `src/statusLineSchema.ts`):

```typescript
{
  session_id: string;
  model: {
    id: string;
    display_name: string;
  }
  workspace: {
    current_dir: string;
    project_dir: string;
  }
  version: string;
  context_window: {
    used_percentage: number | null;
    vim: {
      mode: "INSERT" | "NORMAL";
    }
    agent: {
      name: string;
      type: string;
    }
  }
  // ... and more
}
```

## Logging

Logs are written to `~/.local/state/statusline/app.log`.

In tests, logging is mocked to prevent file I/O. Use the `log` object from `src/logging.ts` for debug/error logging.

## Security Considerations

- The `install` command writes to `~/.claude/` directory
- Custom themes are dynamically imported — paths are resolved and expanded but not strictly sandboxed
- File logging occurs outside the project directory (`~/.local/state/statusline/`)

## Troubleshooting

- **Build fails**: Ensure Bun >=1.3.3 is installed
- **Tests fail with git errors**: Some tests require git to be installed and available in PATH
- **Theme not loading**: Check that the theme file exports a default function

## Useful References

- `src/statusLineSchema.ts` — Full schema definition
- `fixtures/statusline-*.json` — Example status inputs from Claude Code
- `CLAUDE.md` — Additional context for Claude Code (not packaged in npm)
