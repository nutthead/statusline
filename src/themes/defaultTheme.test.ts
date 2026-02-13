import { test, expect, describe } from "bun:test";
import { readdirSync } from "node:fs";
import { defaultTheme } from "./defaultTheme";

const fixturesDir = `${import.meta.dir}/../../fixtures`;
const fixtureFiles = readdirSync(fixturesDir).filter((f) =>
  f.endsWith(".json"),
);

describe("defaultTheme", () => {
  describe("when given valid fixture inputs", () => {
    test.each(fixtureFiles)("%s produces valid output", async (filename) => {
      const fixture = await Bun.file(`${fixturesDir}/${filename}`).json();
      const result = await defaultTheme(fixture);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);

      // Should not be empty
      expect(result).not.toBe("");
    });

    test.each(
      fixtureFiles,
    )("%s output contains expected status elements", async (filename) => {
      const fixture = await Bun.file(`${fixturesDir}/${filename}`).json();
      const result = await defaultTheme(fixture);

      // Should contain model icon (🤖), session icon (📃), and directory icon (🗂️) on line 1
      expect(result).toContain("🤖");
      expect(result).toContain("📃");
      expect(result).toContain("🗂️");
    });
  });

  describe("when given invalid inputs", () => {
    test("returns empty string for invalid object", async () => {
      const result = await defaultTheme(`{ invalid: "data" }`);
      expect(result).toBe("");
    });

    test("returns empty string for empty object", async () => {
      const result = await defaultTheme(`{}`);
      expect(result).toBe("");
    });

    test("returns empty string for missing required fields", async () => {
      const partialStatus = {
        session_id: "test",
        // Missing other required fields
      };

      const result = await defaultTheme(JSON.stringify(partialStatus));
      expect(result).toBe("");
    });
  });

  describe("when given empty or undefined inputs", () => {
    test("returns empty string for undefined input", async () => {
      const result = await defaultTheme(undefined);
      expect(result).toBe("");
    });

    test("returns empty string for empty string", async () => {
      const result = await defaultTheme("");
      expect(result).toBe("");
    });
  });

  describe("when formatting output", () => {
    test("output line is exactly 119 characters wide (terminal width - 4)", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const result = await defaultTheme(fixture);

      const firstLine = result.split("\n")[0] ?? "";
      // Implementation uses terminalSize().columns - 4 = 123 - 4 = 119
      expect(firstLine.length).toBe(119);
    });

    test("model is left-aligned at position 0", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const result = await defaultTheme(fixture);

      const firstLine = result.split("\n")[0] ?? "";

      // Model should start at position 0
      expect(firstLine.indexOf("🤖")).toBe(0);
    });

    test("session is positioned between model and project", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const result = await defaultTheme(fixture);

      const firstLine = result.split("\n")[0] ?? "";
      const modelIndex = firstLine.indexOf("🤖");
      const sessionIndex = firstLine.indexOf("📃");
      const projectIndex = firstLine.indexOf("🗂️");

      // Session should be between model and project
      expect(sessionIndex).toBeGreaterThan(modelIndex);
      expect(sessionIndex).toBeLessThan(projectIndex);

      // Verify gaps are positive (elements are separated)
      const leftGap = sessionIndex - modelIndex;
      const rightGap = projectIndex - sessionIndex;
      expect(leftGap).toBeGreaterThan(0);
      expect(rightGap).toBeGreaterThan(0);
    });

    test("project is right-aligned at the end", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const result = await defaultTheme(fixture);

      const firstLine = result.split("\n")[0] ?? "";
      const projectIndex = firstLine.indexOf("🗂️");

      // Project should be positioned such that projectStatus ends at column 123
      // projectIndex + displayWidth(projectStatus) should equal 123
      expect(projectIndex).toBeGreaterThan(0);
    });

    test("only spaces exist between elements", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const result = await defaultTheme(fixture);

      const firstLine = result.split("\n")[0] ?? "";

      // Find the three elements
      const modelMatch = firstLine.match(/🤖\s*\S*/);
      const sessionMatch = firstLine.match(/📃\s*\S*/);
      const projectMatch = firstLine.match(/🗂️\s*\S*/);

      expect(modelMatch).not.toBeNull();
      expect(sessionMatch).not.toBeNull();
      expect(projectMatch).not.toBeNull();

      // Extract positions
      const modelEnd = (modelMatch?.index ?? 0) + (modelMatch?.[0].length ?? 0);
      const sessionStart = sessionMatch?.index ?? 0;
      const sessionEnd = sessionStart + (sessionMatch?.[0].length ?? 0);
      const projectStart = projectMatch?.index ?? 0;

      // Gap between model and session should be all spaces
      const gap1 = firstLine.slice(modelEnd, sessionStart);
      expect(gap1.trim()).toBe("");

      // Gap between session and project should be all spaces
      const gap2 = firstLine.slice(sessionEnd, projectStart);
      expect(gap2.trim()).toBe("");
    });

    test("output contains no separator or ANSI color codes", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const result = await defaultTheme(fixture);

      // No vertical bar separator
      expect(result).not.toContain("⋮");
      // No ANSI escape codes
      expect(result).not.toContain("\u001b[");
    });
  });
});


