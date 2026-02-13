#!/usr/bin/env node

import meow from "meow";
import { spawnSync } from "node:child_process";
import { access, mkdir, copyFile, unlink } from "node:fs/promises";
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

interface FileSystem {
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  copy(src: string, dest: string): Promise<void>;
  remove(path: string): Promise<void>;
}

interface InstallOptions {
  overwrite: boolean;
  claudeDir: string;
  targetPath: string;
  sourcePath: string;
}

interface InstallDeps {
  fs: FileSystem;
  build: () => Promise<void>;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const defaultFs: FileSystem = {
  exists: fileExists,
  mkdir: async (path, options) => {
    await mkdir(path, options);
  },
  copy: async (src, dest) => {
    await copyFile(src, dest);
  },
  remove: async (path) => {
    await unlink(path);
  },
};

async function build(): Promise<void> {
  console.log("Building statusline binary...");
  await mkdir("target", { recursive: true });
  const result = spawnSync(
    "bun",
    ["build", "--compile", "./index.ts", "--outfile", "target/statusline"],
    { stdio: "inherit" },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Build failed with exit code ${result.status}`);
  }
  console.log("Build complete.");
}

async function installBinary(
  options: InstallOptions,
  deps: InstallDeps,
): Promise<void> {
  await deps.build();

  if (!(await deps.fs.exists(options.claudeDir))) {
    await deps.fs.mkdir(options.claudeDir, { recursive: true });
  }

  if (await deps.fs.exists(options.targetPath)) {
    if (!options.overwrite) {
      throw new Error(
        `${options.targetPath} already exists. Use --overwrite to replace the existing file.`,
      );
    }
    console.log(`Overwriting existing file at ${options.targetPath}...`);
    await deps.fs.remove(options.targetPath);
  }

  await deps.fs.copy(options.sourcePath, options.targetPath);
  console.log(`Installed statusline to ${options.targetPath}`);
}

async function install(overwrite: boolean): Promise<void> {
  await installBinary(
    {
      overwrite,
      claudeDir: CLAUDE_DIR,
      targetPath: TARGET_PATH,
      sourcePath: join(process.cwd(), "target", BINARY_NAME),
    },
    { fs: defaultFs, build },
  );
}

async function main(): Promise<void> {
  try {
    const command = cli.input[0];

    switch (command) {
      case "install":
        await install(cli.flags.overwrite);
        break;
      case undefined:
        cli.showHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        cli.showHelp(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export {
  build,
  install,
  installBinary,
  type FileSystem,
  type InstallDeps,
  type InstallOptions,
};
