#!/usr/bin/env bun

import { $ } from "bun";
import { homedir } from "node:os";
import { join } from "node:path";

const BINARY_NAME = "statusline";
const CLAUDE_DIR = join(homedir(), ".claude");
const TARGET_PATH = join(CLAUDE_DIR, BINARY_NAME);

async function build(): Promise<void> {
  console.log("Building statusline binary...");
  await $`mkdir -p target && bun build --compile ./index.ts --outfile target/statusline`;
  console.log("Build complete.");
}

async function install(overwrite: boolean): Promise<void> {
  // Build first
  await build();

  // Ensure ~/.claude directory exists (mkdir -p is idempotent)
  await $`mkdir -p ${CLAUDE_DIR}`;

  // Check if target file exists
  const targetFile = Bun.file(TARGET_PATH);
  if (await targetFile.exists()) {
    if (!overwrite) {
      console.error(`Error: ${TARGET_PATH} already exists.`);
      console.error("Use --overwrite to replace the existing file.");
      process.exit(1);
    }
    console.log(`Overwriting existing file at ${TARGET_PATH}...`);
  }

  // Copy binary to destination
  const sourcePath = join(process.cwd(), "target", BINARY_NAME);
  await $`cp ${sourcePath} ${TARGET_PATH}`;
  console.log(`Installed statusline to ${TARGET_PATH}`);
}

function printUsage(): void {
  console.log(`Usage: cc-statusline <command> [options]

Commands:
  install             Build and install statusline to ~/.claude/

Options:
  --overwrite         Overwrite existing file if it exists
  --help, -h          Show this help message`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("-"));
  const flags = new Set(args.filter((arg) => arg.startsWith("-")));

  if (flags.has("--help") || flags.has("-h") || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  switch (command) {
    case "install":
      await install(flags.has("--overwrite"));
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
