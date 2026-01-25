#!/usr/bin/env node

import meow from "meow";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BINARY_NAME = "statusline";
const CLAUDE_DIR = join(homedir(), ".claude");
const TARGET_PATH = join(CLAUDE_DIR, BINARY_NAME);

const cli = meow(
  `
  Usage
    $ cc-statusline <command>

  Commands
    install    Build and install statusline to ~/.claude/

  Options
    --overwrite  Overwrite existing file if it exists

  Examples
    $ cc-statusline install
    $ cc-statusline install --overwrite
`,
  {
    importMeta: import.meta,
    flags: {
      overwrite: {
        type: "boolean",
        default: false,
      },
    },
  },
);

export function build(): void {
  console.log("Building statusline binary...");
  execSync(
    "mkdir -p target && bun build --compile ./index.ts --outfile target/statusline",
    { stdio: "inherit" },
  );
  console.log("Build complete.");
}

export interface InstallDeps {
  claudeDir: string;
  targetPath: string;
  sourcePath: string;
  doBuild: () => void;
  existsSync: (path: string) => boolean;
  mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
  copyFileSync: (src: string, dest: string) => void;
  unlinkSync: (path: string) => void;
}

const defaultDeps: InstallDeps = {
  claudeDir: CLAUDE_DIR,
  targetPath: TARGET_PATH,
  sourcePath: join(process.cwd(), "target", BINARY_NAME),
  doBuild: build,
  existsSync,
  mkdirSync,
  copyFileSync,
  unlinkSync,
};

export function installBinary(
  overwrite: boolean,
  deps: InstallDeps = defaultDeps,
): void {
  deps.doBuild();

  if (!deps.existsSync(deps.claudeDir)) {
    deps.mkdirSync(deps.claudeDir, { recursive: true });
  }

  if (deps.existsSync(deps.targetPath)) {
    if (!overwrite) {
      console.error(`Error: ${deps.targetPath} already exists.`);
      console.error("Use --overwrite to replace the existing file.");
      process.exit(1);
    }
    console.log(`Overwriting existing file at ${deps.targetPath}...`);
    deps.unlinkSync(deps.targetPath);
  }

  deps.copyFileSync(deps.sourcePath, deps.targetPath);
  console.log(`Installed statusline to ${deps.targetPath}`);
}

export function install(overwrite: boolean): void {
  installBinary(overwrite);
}

function main(): void {
  const command = cli.input[0];

  switch (command) {
    case "install":
      install(cli.flags.overwrite);
      break;
    case undefined:
      cli.showHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      cli.showHelp(1);
  }
}

if (import.meta.main) {
  main();
}
