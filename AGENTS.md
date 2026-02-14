# AGENTS.md

This document provides essential information for AI coding agents working on the `@nutthead/cc-statusline` project.

## Project Overview

**@nutthead/cc-statusline** is a themeable status line provider for Claude Code. It reads JSON status data from stdin, formats it using a theme function, and outputs a human-readable status line to stdout.

The project is published on npm as `@nutthead/cc-statusline` and provides:

- A **CLI tool** (`bin/cc-statusline.js`) for installing the status line binary
- A **runtime binary** (`target/statusline`) that formats and displays the status line

### How It Works

1. Claude Code invokes the status line binary with JSON data via stdin
2. The binary parses the JSON (validated via Zod schema), applies a theme function
3. The formatted status line is output to stdout and displayed in Claude Code's interface

## Technology Stack

| Component          | Technology        | Version/Notes             |
| ------------------ | ----------------- | ------------------------- |
| Runtime            | Bun               | >=1.3.3                   |
| Language           | TypeScript        | ESNext, strict mode       |
| Package Manager    | Bun               | Uses `bun.lock`           |
| Linting/Formatting | Biome             | v2.3.15                   |
| Task Runner        | Just              | justfile for common tasks |
| Testing            | Bun's test runner | `bun:test`                |

## Key Dependencies

| Package                   | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `@logtape/logtape`        | Structured logging                                               |
| `@logtape/file`           | File sink for logs at `~/.local/state/statusline/app.log`        |
| `chalk`                   | Terminal colors and styling                                      |
| `meow`                    | CLI argument parsing                                             |
| `neverthrow`              | Type-safe error handling (available but unused in current code)  |
| `simple-git`              | Git operations for branch detection                              |
| `terminal-size`           | Get terminal dimensions for layout calculations                  |
| `ts-pattern`              | Exhaustive pattern matching                                      |
| `type-fest`               | TypeScript utility types                                         |
| `zod`                     | Runtime schema validation for status line input                  |

## Project Structure

```
.
├── index.ts                         # Main entry point: reads stdin, applies theme, outputs status
├── src/
│   ├── cli.ts                       # CLI entry point for `install` command
│   ├── cli.test.ts                  # Tests for CLI install functionality
│   ├── logging.ts                   # LogTape configuration
│   ├── schema/
│   │   ├── statusLine.ts            # Zod schema for Claude Code status JSON
│   │   └── statusLine.test.ts       # Schema validation tests
│   ├── themes/
│   │   ├── defaultTheme.ts          # Default two-row status line theme
│   │   ├── defaultTheme.test.ts     # Default theme rendering tests
│   │   ├── powerlineTheme.ts        # Powerline-style single-row theme
│   │   └── powerlineTheme.test.ts   # Powerline theme rendering tests
│   ├── theme/
│   │   ├── loadTheme.ts             # Dynamic theme loader (supports custom themes)
│   │   └── loadTheme.test.ts        # Theme loader tests
│   └── utils/
│       ├── git.ts                   # Git branch detection using simple-git
│       ├── git.test.ts              # Git utility tests
│       ├── model.ts                 # Model ID abbreviation utilities
│       ├── model.test.ts            # Model utility tests
│       ├── path.ts                  # Path compression and formatting
│       ├── path.test.ts             # Path utility tests
│       ├── term.ts                  # Terminal display width calculations
│       └── term.test.ts             # Terminal utility tests
├── test/
│   └── setup.ts                     # Test preloader (mocks file logging, homedir, terminal-size, chalk)
├── fixtures/                        # JSON fixtures for testing
│   ├── statusline-1.json            # Example status with null usage
│   └── statusline-2.json            # Example status with actual usage data
├── bin/                             # Compiled CLI output (gitignored, committed to npm)
│   └── cc-statusline.js             # Compiled CLI for npm distribution
├── target/                          # Compiled binary output (gitignored)
│   └── statusline                   # Standalone Bun binary
├── package.json                     # Package manifest
├── tsconfig.json                    # TypeScript configuration
├── biome.json                       # Biome formatter/linter config
├── bunfig.toml                      # Bun configuration (test preload)
├── justfile                         # Just task runner recipes
└── README.md                        # User-facing documentation
```

## Dual Entry Points

The project has two distinct entry points with different purposes:

### 1. `index.ts` — Bun Binary Entry Point

- Reads JSON from `Bun.stdin`
- Applies theme function (built-in or custom via `--theme-file` flag)
- Outputs formatted status line to stdout
- Compiled to standalone binary at `target/statusline`
- Used by Claude Code at runtime

**Usage:**

```bash
echo '<json>' | ./target/statusline
echo '<json>' | ./target/statusline --theme powerline
echo '<json>' | ./target/statusline --theme-file ~/.config/cc-statusline/theme.js
```

**Flags:**
- `--theme, -t` — Use a built-in theme (`powerline`)
- `--theme-file, -f` — Use a custom theme file (mutually exclusive with `--theme`)

### 2. `src/cli.ts` — Node CLI Entry Point

- Provides the `install` command for users
- Builds the binary and copies it to `~/.claude/`
- What npm users invoke via `bunx @nutthead/cc-statusline install`
- Compiled to `bin/cc-statusline.js` for npm distribution

**Usage:**

```bash
bunx @nutthead/cc-statusline install
bunx @nutthead/cc-statusline install --overwrite
```

## Build System

### NPM Scripts (package.json)

```bash
# Build standalone binary to target/statusline
bun run build:binary

# Build CLI for npm distribution to bin/cc-statusline.js
bun run build:cli

# Install binary to ~/.claude/
bun run install:binary

# Format code with Biome
bun run biome:format

# Lint and auto-fix with Biome
bun run biome:lint

# Pre-publish hook (runs build:cli)
bun run prepublishOnly
```

### Just Recipes (justfile)

```bash
# Check, format, lint, and organize imports with Biome
just check

# Build the standalone Bun binary (runs check first)
just build

# Build then install the binary to ~/.claude/ (runs check and build first)
just install
```

## Testing

Tests are co-located with source files using the pattern `*.test.ts`.

### Running Tests

```bash
# Run all tests
bun test

# Run a specific test file
bun test src/utils/path.test.ts

# Run with watch mode
bun test --watch

# Run with coverage
bun test --coverage
```

### Test Setup (`test/setup.ts`)

The `bunfig.toml` preloads `test/setup.ts` before running tests, which mocks:

- `@logtape/file` → suppresses file I/O during tests
- `node:os` homedir → returns `/home/testuser` for consistent testing
- `terminal-size` → returns fixed dimensions `{ columns: 123, rows: 24 }`
- `chalk` → identity functions to disable colors in tests

### Testing Patterns

- Import from `bun:test` (`describe`, `test`, `expect`, `mock`, `spyOn`)
- Tests use actual git operations against temporary directories where appropriate
- Fixture files in `fixtures/` are used for integration testing themes
- Each utility module has comprehensive unit tests

## Code Style Guidelines

### Biome Configuration

Configuration in `biome.json`:

| Setting          | Value                                          |
| ---------------- | ---------------------------------------------- |
| Formatter        | Enabled, 2-space indentation                   |
| Quotes           | Double quotes for JavaScript                   |
| Linter           | Enabled with recommended rules                 |
| Organize Imports | Enabled (automatically sorts and deduplicates) |
| VCS Integration  | Enabled, respects `.gitignore`                 |

### TypeScript Conventions

Configuration in `tsconfig.json`:

| Setting                      | Value     | Purpose                                  |
| ---------------------------- | --------- | ---------------------------------------- |
| `strict`                     | `true`    | Enable all strict type-checking options  |
| `noUncheckedIndexedAccess`   | `true`    | Always handle undefined for index access |
| `verbatimModuleSyntax`       | `true`    | Use `import type` for type imports       |
| `noEmit`                     | `true`    | Bun handles TypeScript directly          |
| `moduleResolution`           | `bundler` | Modern module resolution                 |
| `allowImportingTsExtensions` | `true`    | Import `.ts` files directly              |

### Naming & Style

- **Functions**: camelCase (e.g., `currentBranchName`, `abbreviateModelId`)
- **Types/Interfaces**: PascalCase (e.g., `BranchResult`, `Status`)
- **Files**: camelCase (except entry points like `index.ts`)
- **Constants**: UPPER_SNAKE_CASE for module-level constants
- Prefer `async/await` over raw promises
- Use `ts-pattern` for exhaustive pattern matching instead of switch statements
- Use JSDoc comments for public functions

## Built-in Themes

### Default Theme (`src/themes/defaultTheme.ts`)

Renders a **two-row status line**:

**Row 1** (left to right):
- 🤖 Model ID (abbreviated, e.g., "opus-4.5") with version
- 📃 Session ID (full UUID)
- 🗂️ Project directory (compressed and telescoped path)

**Row 2** (left to right):
- Git status: 🌿 branch-name, 🪾 commit-hash, 💾 (not a repo), or 💥 (error)
- Context window usage percentage (colorized: green ≤50%, blue ≤75%, yellow ≤87.5%, red >87.5%)

### Powerline Theme (`src/themes/powerlineTheme.ts`)

Renders a **single-row status line** with powerline arrows:
- Uses right-pointing solid triangle (U+E0B0) separators
- Muted dark background colors for each segment
- Segments: Model → Session → Project → Git → Usage
- Wraps to multiple lines when segments exceed terminal width

## Custom Themes

Users can provide custom themes via `--theme-file <path>`:

```typescript
// Theme function signature
type ThemeFunction = (input?: string) => Promise<string>;

// Example custom theme at ~/.config/cc-statusline/theme.js
export default async function theme(input?: string) {
  if (!input) return "";
  const status = JSON.parse(input);
  const dir = status.workspace.current_dir;
  const model = status.model.display_name;
  const ctx = status.context_window.used_percentage ?? 0;
  return `${model} | ${dir} | ctx: ${Math.round(ctx)}%`;
}
```

Theme paths support `~` expansion to the user's home directory. Themes are dynamically imported at runtime.

## Status Line Schema

The JSON input from Claude Code is validated using Zod. See `src/schema/statusLine.ts` for the full schema.

### Key Fields

| Field                                 | Type                   | Description                                         |
| ------------------------------------- | ---------------------- | --------------------------------------------------- |
| `session_id`                          | `string`               | UUID of the current session                         |
| `transcript_path`                     | `string`               | Path to session transcript                          |
| `cwd`                                 | `string`               | Current working directory                           |
| `model.id`                            | `string`               | Model identifier (e.g., "claude-opus-4-5-20251101") |
| `model.display_name`                  | `string`               | Human-readable model name (e.g., "Opus 4.5")        |
| `workspace.current_dir`               | `string`               | Current directory in workspace                      |
| `workspace.project_dir`               | `string`               | Project root directory                              |
| `version`                             | `string`               | Claude Code version                                 |
| `output_style.name`                   | `string`               | Output style (e.g., "Explanatory")                  |
| `context_window.total_input_tokens`   | `number`               | Total input tokens used                             |
| `context_window.total_output_tokens`  | `number`               | Total output tokens used                            |
| `context_window.context_window_size`  | `number`               | Maximum context window size                         |
| `context_window.current_usage`        | `object \| null`       | Current usage breakdown                             |
| `context_window.used_percentage`      | `number \| null`       | Percentage of context used                          |
| `context_window.remaining_percentage` | `number \| null`       | Percentage of context remaining                     |
| `context_window.vim.mode`             | `"INSERT" \| "NORMAL"` | Vim mode (if applicable)                            |
| `context_window.agent.name`           | `string`               | Agent name                                          |
| `context_window.agent.type`           | `string`               | Agent type                                          |

## Utility Modules

### `src/utils/git.ts`

Git branch detection using `simple-git`:

- `currentBranchName(cwd?)` → Returns `BranchResult` with status: `"none"`, `"branch"`, `"detached"`, or `"error"`
- `currentGitStatus()` → Returns formatted string with emoji

### `src/utils/path.ts`

Path formatting utilities:

- `compress(path)` → Compress path segments to first character (e.g., "/home/user/foo" → "/h/u/foo")
- `tildify(path)` → Replace home directory with `~`
- `telescope(path)` → Show first/last segments with ellipsis (e.g., "~/a/b/c" → "~/…/c")

### `src/utils/model.ts`

Model ID formatting:

- `abbreviateModelId(model, options?)` → Strip "claude-" prefix and truncate to fit (default 12 chars)

### `src/utils/term.ts`

Terminal utilities:

- `getDisplayWidth(str)` → Calculate display width accounting for emoji (2 columns each)

## Logging

Logs are written to `~/.local/state/statusline/app.log` using LogTape.

In tests, logging is mocked to prevent file I/O. Use the `log` object from `src/logging.ts`:

```typescript
import { log } from "./logging";

log.debug("message: {value}", { value });
log.error("error occurred: {error}", { error: error.message });
```

## Security Considerations

- The `install` command writes to `~/.claude/` directory
- Custom themes are dynamically imported — paths are resolved and expanded but not strictly sandboxed
- File logging occurs outside the project directory (`~/.local/state/statusline/`)
- The binary reads from stdin and parses JSON — the schema validation helps prevent injection

## Troubleshooting

| Issue                          | Solution                                                             |
| ------------------------------ | -------------------------------------------------------------------- |
| Build fails                    | Ensure Bun >=1.3.3 is installed (`bun --version`)                    |
| Tests fail with git errors     | Some tests require git to be installed and available in PATH         |
| Theme not loading              | Check that the theme file exports a default function                 |
| Binary not found after install | Ensure `~/.claude/` is in your PATH or use absolute path             |
| Empty status line              | Check logs at `~/.local/state/statusline/app.log` for parsing errors |

## Release Process

```bash
# 1. Bump version (updates package.json, commits, and creates git tag)
npm version minor        # or: npm version patch / npm version major

# 2. Push commit and tag to GitHub
git push && git push --tags

# 3. Publish to npm (runs prepublishOnly → builds CLI automatically)
npm publish

# 4. Create GitHub release from the tag
gh release create v<version> --generate-notes
```

## Useful References

- `src/schema/statusLine.ts` — Full Zod schema definition
- `fixtures/statusline-*.json` — Example status inputs from Claude Code
- `README.md` — User-facing documentation
