import { test, expect, describe, beforeAll, afterAll, mock } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock homedir for consistent tilde expansion testing
mock.module("node:os", () => ({
  homedir: () => "/home/testuser",
}));

// Import after mocking
import { loadTheme } from "./loadTheme";

describe("loadTheme", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "theme-test-"));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("valid theme loading", () => {
    test("loads a valid theme module with default export", async () => {
      const themePath = join(tempDir, "valid-theme.ts");
      await writeFile(
        themePath,
        `export default async function(input?: string) { return "themed: " + input; }`
      );

      const theme = await loadTheme(themePath);

      expect(theme).not.toBeNull();
      expect(typeof theme).toBe("function");
      if (theme) {
        const result = await theme("test");
        expect(result).toBe("themed: test");
      }
    });

    test("loads a JavaScript theme file", async () => {
      const themePath = join(tempDir, "js-theme.js");
      await writeFile(
        themePath,
        `module.exports = async function(input) { return "js-themed"; };
         module.exports.default = module.exports;`
      );

      const theme = await loadTheme(themePath);

      expect(theme).not.toBeNull();
    });
  });

  describe("invalid theme handling", () => {
    test("throws for non-existent file", () => {
      // Current implementation throws on import failure rather than returning null
      expect(loadTheme(join(tempDir, "does-not-exist.ts"))).rejects.toThrow();
    });

    test("returns null for module without default export", async () => {
      const themePath = join(tempDir, "no-default.ts");
      await writeFile(
        themePath,
        `export const namedExport = () => "not default";`
      );

      const theme = await loadTheme(themePath);

      expect(theme).toBeNull();
    });

    test("returns null when default export is not a function", async () => {
      const themePath = join(tempDir, "not-function.ts");
      await writeFile(themePath, `export default "I am a string";`);

      const theme = await loadTheme(themePath);

      expect(theme).toBeNull();
    });
  });

  describe("theme function behavior", () => {
    test("loaded theme receives input parameter", async () => {
      const themePath = join(tempDir, "echo-theme.ts");
      await writeFile(
        themePath,
        `export default async function(input?: string) {
          return JSON.stringify({ received: input });
        }`
      );

      const theme = await loadTheme(themePath);
      expect(theme).not.toBeNull();

      if (theme) {
        const result = await theme("hello world");
        expect(result).toBe('{"received":"hello world"}');
      }
    });

    test("loaded theme handles undefined input", async () => {
      const themePath = join(tempDir, "undefined-handler.ts");
      await writeFile(
        themePath,
        `export default async function(input?: string) {
          return input ?? "no input";
        }`
      );

      const theme = await loadTheme(themePath);
      expect(theme).not.toBeNull();

      if (theme) {
        const result = await theme(undefined);
        expect(result).toBe("no input");
      }
    });
  });
});
