import { describe, test, expect, mock, spyOn, beforeEach } from "bun:test";
import { installBinary, type InstallDeps } from "./cli";

describe("installBinary", () => {
  let mockDeps: InstallDeps;
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockDeps = {
      claudeDir: "/mock/.claude",
      targetPath: "/mock/.claude/statusline",
      sourcePath: "/mock/target/statusline",
      doBuild: mock(() => {}),
      existsSync: mock(() => false),
      mkdirSync: mock(() => {}),
      copyFileSync: mock(() => {}),
      unlinkSync: mock(() => {}),
    };

    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
  });

  test("fresh install creates directory and copies file", () => {
    // claudeDir doesn't exist, targetPath doesn't exist
    mockDeps.existsSync = mock((_path: string) => false);

    installBinary(false, mockDeps);

    expect(mockDeps.doBuild).toHaveBeenCalled();
    expect(mockDeps.mkdirSync).toHaveBeenCalledWith("/mock/.claude", {
      recursive: true,
    });
    expect(mockDeps.copyFileSync).toHaveBeenCalledWith(
      "/mock/target/statusline",
      "/mock/.claude/statusline",
    );
    expect(mockDeps.unlinkSync).not.toHaveBeenCalled();
  });

  test("install when directory exists but file doesn't", () => {
    // claudeDir exists, targetPath doesn't exist
    mockDeps.existsSync = mock((path: string) => path === "/mock/.claude");

    installBinary(false, mockDeps);

    expect(mockDeps.doBuild).toHaveBeenCalled();
    expect(mockDeps.mkdirSync).not.toHaveBeenCalled();
    expect(mockDeps.copyFileSync).toHaveBeenCalledWith(
      "/mock/target/statusline",
      "/mock/.claude/statusline",
    );
  });

  test("rejects overwrite when file exists and --overwrite not set", () => {
    // Both directory and file exist
    mockDeps.existsSync = mock(() => true);

    expect(() => installBinary(false, mockDeps)).toThrow("process.exit called");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error: /mock/.claude/statusline already exists.",
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Use --overwrite to replace the existing file.",
    );
    expect(mockDeps.copyFileSync).not.toHaveBeenCalled();
  });

  test("overwrites existing file when --overwrite is set", () => {
    // Both directory and file exist
    mockDeps.existsSync = mock(() => true);

    installBinary(true, mockDeps);

    expect(mockDeps.unlinkSync).toHaveBeenCalledWith(
      "/mock/.claude/statusline",
    );
    expect(mockDeps.copyFileSync).toHaveBeenCalledWith(
      "/mock/target/statusline",
      "/mock/.claude/statusline",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Overwriting existing file at /mock/.claude/statusline...",
    );
  });

  test("always calls build first", () => {
    const callOrder: string[] = [];
    mockDeps.doBuild = mock(() => callOrder.push("build"));
    mockDeps.copyFileSync = mock(() => callOrder.push("copy"));
    mockDeps.existsSync = mock(() => false);

    installBinary(false, mockDeps);

    expect(callOrder).toEqual(["build", "copy"]);
  });
});
