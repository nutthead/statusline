#!/usr/bin/env node

// src/cli.ts
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
var BINARY_NAME = "statusline";
var CLAUDE_DIR = join(homedir(), ".claude");
var TARGET_PATH = join(CLAUDE_DIR, BINARY_NAME);
function build() {
  console.log("Building statusline binary...");
  execSync("mkdir -p target && bun build --compile ./index.ts --outfile target/statusline", {
    stdio: "inherit"
  });
  console.log("Build complete.");
}
function install(overwrite) {
  build();
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }
  if (existsSync(TARGET_PATH)) {
    if (!overwrite) {
      console.error(`Error: ${TARGET_PATH} already exists.`);
      console.error("Use --overwrite to replace the existing file.");
      process.exit(1);
    }
    console.log(`Overwriting existing file at ${TARGET_PATH}...`);
    unlinkSync(TARGET_PATH);
  }
  const sourcePath = join(process.cwd(), "target", BINARY_NAME);
  copyFileSync(sourcePath, TARGET_PATH);
  console.log(`Installed statusline to ${TARGET_PATH}`);
}
function printUsage() {
  console.log(`Usage: cc-statusline <command> [options]

Commands:
  install             Build and install statusline to ~/.claude/

Options:
  --overwrite         Overwrite existing file if it exists
  --help, -h          Show this help message`);
}
function main() {
  const args = process.argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("-"));
  const flags = new Set(args.filter((arg) => arg.startsWith("-")));
  if (flags.has("--help") || flags.has("-h") || args.length === 0) {
    printUsage();
    process.exit(0);
  }
  switch (command) {
    case "install":
      install(flags.has("--overwrite"));
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}
main();
