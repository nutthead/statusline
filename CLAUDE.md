# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: statusline

A custom status line for Claude Code. Published as `@nutthead/cc-statusline` on npm.

## Build & Run

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.ts>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

### Scripts

- `bun run build:binary` — Compiles `index.ts` into a standalone binary at `target/statusline`
- `bun run build:cli` — Bundles `src/cli.ts` into `bin/cc-statusline.js` (Node-compatible, for npm distribution)
- `bun run install:binary` — Copies the compiled binary to `~/.claude/`

### Testing

- `bun test` — Run all tests
- `bun test src/utils.test.ts` — Run a single test file
- Tests are co-located with source files (`*.test.ts` alongside `*.ts` in `src/`)
- Test preload in `bunfig.toml` loads `test/setup.ts`, which mocks `@logtape/file` to suppress file I/O during tests

## Architecture

### Dual entry points

- **`index.ts`** — Bun binary entry point. Reads JSON from stdin, applies a theme function, outputs the formatted status line. Used when the compiled binary runs inside Claude Code.
- **`src/cli.ts`** — Node CLI entry point (`bin/cc-statusline.js`). Provides the `install` command that builds the binary and copies it to `~/.claude/`. This is what npm users invoke via `bunx @nutthead/cc-statusline install`.

### Key modules

- **`src/statusLineSchema.ts`** — Zod schema (`statusSchema`) defining the JSON structure Claude Code sends to the status line. The `Status` type is inferred from this schema.
- **`src/themes/defaultTheme.ts`** — Default theme function. Parses stdin JSON via the schema, formats a two-row status line (directory + git on row 1, model + session on row 2) using `ansi-colors`.
- **`src/theme/loadTheme.ts`** — Dynamic theme loader. Resolves a `--theme` path (supports `~`) and `import()`s it, expecting a default-exported theme function.
- **`src/utils.ts`** — Formatting helpers: `abbreviatePath` (shortens path segments), `abbreviateModelId` (strips `claude-` prefix), `currentBranchName` (via `simple-git`), `currentGitStatus`, `workspaceStatus`, `currentModelStatus`.
- **`src/logging.ts`** — LogTape configuration. Logs to `~/.local/state/statusline/app.log`.

### Custom themes

Users can provide a `--theme <path>` flag pointing to a JS module with a default export of type `(input?: string) => Promise<string>`. The theme receives the raw JSON string from Claude Code.

## Bun APIs

- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile.
- `Bun.$\`cmd\`` instead of execa.

## Key dependencies

- **zod** (v4) — Schema validation. Uses `z.treeifyError` for error formatting.
- **meow** — CLI argument parsing (both entry points).
- **simple-git** — Git operations for branch detection.
- **ts-pattern** — Exhaustive pattern matching (used in `currentGitStatus`).
- **ansi-colors** — Terminal color output in themes.
- **@logtape/logtape** + **@logtape/file** — Structured file logging.
