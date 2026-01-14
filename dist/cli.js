#!/usr/bin/env bun
// @bun

// src/cli.ts
var {$ } = globalThis.Bun;
import { homedir } from "os";
import { join } from "path";
var BINARY_NAME = "statusline";
var CLAUDE_DIR = join(homedir(), ".claude");
var TARGET_PATH = join(CLAUDE_DIR, BINARY_NAME);
async function build() {
  console.log("Building statusline binary...");
  await $`mkdir -p target && bun build --compile ./index.ts --outfile target/statusline`;
  console.log("Build complete.");
}
async function install(overwrite) {
  await build();
  await $`mkdir -p ${CLAUDE_DIR}`;
  const targetFile = Bun.file(TARGET_PATH);
  if (await targetFile.exists()) {
    if (!overwrite) {
      console.error(`Error: ${TARGET_PATH} already exists.`);
      console.error("Use --overwrite to replace the existing file.");
      process.exit(1);
    }
    console.log(`Overwriting existing file at ${TARGET_PATH}...`);
  }
  const sourcePath = join(process.cwd(), "target", BINARY_NAME);
  await $`cp ${sourcePath} ${TARGET_PATH}`;
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
async function main() {
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
