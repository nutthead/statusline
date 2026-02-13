import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import {
  type FileSystem,
  type InstallDeps,
  type InstallOptions,
  installBinary,
} from "./cli";

describe("installBinary", () => {
  let mockFs: FileSystem;
  let mockDeps: InstallDeps;
  let options: InstallOptions;
  let consoleLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockFs = {
      exists: mock(async () => false),
      mkdir: mock(async () => {}),
      copy: mock(async () => {}),
      remove: mock(async () => {}),
    };

    mockDeps = {
      fs: mockFs,
      build: mock(async () => {}),
    };

    options = {
      overwrite: false,
      claudeDir: "/mock/.claude",
      targetPath: "/mock/.claude/statusline",
      sourcePath: "/mock/target/statusline",
    };

    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  test("fresh install creates directory and copies file", async () => {
    mockFs.exists = mock(async () => false);

    await installBinary(options, mockDeps);

    expect(mockDeps.build).toHaveBeenCalled();
    expect(mockFs.mkdir).toHaveBeenCalledWith("/mock/.claude", {
      recursive: true,
    });
    expect(mockFs.copy).toHaveBeenCalledWith(
      "/mock/target/statusline",
      "/mock/.claude/statusline",
    );
    expect(mockFs.remove).not.toHaveBeenCalled();
  });

  test("install when directory exists but file doesn't", async () => {
    mockFs.exists = mock(async (path: string) => path === "/mock/.claude");

    await installBinary(options, mockDeps);

    expect(mockDeps.build).toHaveBeenCalled();
    expect(mockFs.mkdir).not.toHaveBeenCalled();
    expect(mockFs.copy).toHaveBeenCalledWith(
      "/mock/target/statusline",
      "/mock/.claude/statusline",
    );
  });

  test("rejects overwrite when file exists and --overwrite not set", async () => {
    mockFs.exists = mock(async () => true);

    await expect(installBinary(options, mockDeps)).rejects.toThrow(
      "/mock/.claude/statusline already exists",
    );
    expect(mockFs.copy).not.toHaveBeenCalled();
  });

  test("overwrites existing file when --overwrite is set", async () => {
    mockFs.exists = mock(async () => true);
    options.overwrite = true;

    await installBinary(options, mockDeps);

    expect(mockFs.remove).toHaveBeenCalledWith("/mock/.claude/statusline");
    expect(mockFs.copy).toHaveBeenCalledWith(
      "/mock/target/statusline",
      "/mock/.claude/statusline",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Overwriting existing file at /mock/.claude/statusline...",
    );
  });

  test("always calls build first", async () => {
    const callOrder: string[] = [];
    mockDeps.build = mock(async () => {
      callOrder.push("build");
    });
    mockFs.copy = mock(async () => {
      callOrder.push("copy");
    });
    mockFs.exists = mock(async () => false);

    await installBinary(options, mockDeps);

    expect(callOrder).toEqual(["build", "copy"]);
  });
});
