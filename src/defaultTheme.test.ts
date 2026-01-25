import { test, expect, describe } from "bun:test";
import { readdirSync } from "node:fs";
import { defaultTheme } from "./defaultTheme";

const fixturesDir = `${import.meta.dir}/../fixtures`;
const fixtureFiles = readdirSync(fixturesDir).filter((f) =>
  f.endsWith(".json"),
);

describe("defaultTheme", () => {
  describe("valid fixture inputs", () => {
    test.each(fixtureFiles)("%s produces valid output", async (filename) => {
      const fixture = await Bun.file(`${fixturesDir}/${filename}`).json();
      const result = await defaultTheme(fixture);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      // Should not be error states
      expect(result).not.toBe("[malformed status]");
      expect(result).not.toBe("[no status]");
    });

    test.each(fixtureFiles)(
      "%s output contains expected status elements",
      async (filename) => {
        const fixture = await Bun.file(`${fixturesDir}/${filename}`).json();
        const result = await defaultTheme(fixture);

        // Should contain directory icon
        expect(result).toContain("🗂️");
        // Should contain model icon
        expect(result).toContain("⏣");
        // Should contain session icon
        expect(result).toContain("📝");
        // Should be multi-line (two status lines)
        expect(result).toContain("\n");
      },
    );
  });

  describe("invalid inputs", () => {
    test("returns [malformed status] for invalid object", async () => {
      const result = await defaultTheme(`{ invalid: "data" }`);
      expect(result).toBe("[malformed status]");
    });

    test("returns [malformed status] for empty object", async () => {
      const result = await defaultTheme(`{}`);
      expect(result).toBe("[malformed status]");
    });

    test("returns [malformed status] for missing required fields", async () => {
      const partialStatus = {
        session_id: "test",
        // Missing other required fields
      };
      const result = await defaultTheme(JSON.stringify(partialStatus));
      expect(result).toBe("[malformed status]");
    });
  });

  describe("empty/undefined inputs", () => {
    test("returns [no status] for undefined input", async () => {
      const result = await defaultTheme(undefined);
      expect(result).toBe("[no status]");
    });

    test("returns [no status] for empty string", async () => {
      const result = await defaultTheme("");
      expect(result).toBe("[no status]");
    });
  });

  describe("output format", () => {
    test("output has two lines separated by newline", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const result = await defaultTheme(fixture);

      const lines = result.split("\n");
      expect(lines.length).toBe(2);
    });

    test("first line contains directory and git status", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const result = await defaultTheme(fixture);

      const lines = result.split("\n");
      const firstLine = lines[0]!;
      // First line should have directory icon
      expect(firstLine).toContain("🗂️");
      // First line should have git emoji (branch, detached, not-git, or error)
      const gitEmojis = ["🌿", "🪾", "💾", "💥"];
      const hasGitEmoji = gitEmojis.some((emoji) => firstLine.includes(emoji));
      expect(hasGitEmoji).toBe(true);
    });

    test("second line contains model and session info", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const result = await defaultTheme(fixture);

      const [, secondLine] = result.split("\n");
      // Second line should have model icon
      expect(secondLine).toContain("⏣");
      // Second line should have session icon
      expect(secondLine).toContain("📝");
    });

    test("lines are separated by styled separator", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const result = await defaultTheme(fixture);

      // The separator ⋮ should appear in the output (may have ANSI codes around it)
      expect(result).toContain("⋮");
    });
  });
});
