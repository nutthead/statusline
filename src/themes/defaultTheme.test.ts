import { describe, expect, test } from "bun:test";
import { defaultTheme } from "./defaultTheme";

describe("defaultTheme", () => {
  describe("when input is empty or undefined", () => {
    test("returns empty string for undefined input", async () => {
      const result = await defaultTheme(undefined);
      expect(result).toBe("");
    });

    test("returns empty string for empty string input", async () => {
      const result = await defaultTheme("");
      expect(result).toBe("");
    });
  });

  describe("when input is invalid JSON or schema", () => {
    test("returns empty string for invalid JSON", async () => {
      const result = await defaultTheme("not valid json");
      expect(result).toBe("");
    });

    test("returns empty string for valid JSON but invalid schema", async () => {
      const result = await defaultTheme('{"foo": "bar"}');
      expect(result).toBe("");
    });

    test("returns empty string for null input", async () => {
      const result = await defaultTheme("null");
      expect(result).toBe("");
    });
  });

  describe("when input is valid status JSON", () => {
    const baseStatus = {
      session_id: "3694cfa9-53b4-4025-ab41-f8fa913a189b",
      transcript_path: "/home/testuser/.claude/projects/test.jsonl",
      cwd: "/home/testuser/Projects/statusline",
      model: { id: "claude-opus-4-5", display_name: "Opus 4.5" },
      workspace: {
        current_dir: "/home/testuser/Projects/statusline",
        project_dir: "/home/testuser/Projects/statusline",
      },
      version: "2.1.3",
      output_style: { name: "Explanatory" },
      cost: {
        total_cost_usd: 0,
        total_duration_ms: 1345,
        total_api_duration_ms: 0,
        total_lines_added: 0,
        total_lines_removed: 0,
      },
      context_window: {
        total_input_tokens: 0,
        total_output_tokens: 0,
        context_window_size: 200000,
        current_usage: null,
        used_percentage: null,
        remaining_percentage: null,
        vim: { mode: "NORMAL" },
        agent: { name: "main", type: "primary" },
      },
      exceeds_200k_tokens: false,
    };

    test("renders two-line output with valid input", async () => {
      const result = await defaultTheme(JSON.stringify(baseStatus));
      const lines = result.split("\n");
      expect(lines.length).toBe(2);
    });

    test("line 1 contains model info with version", async () => {
      const result = await defaultTheme(JSON.stringify(baseStatus));
      const line1 = result.split("\n")[0];
      expect(line1).toContain("🤖");
      expect(line1).toContain("opus-4-5");
      expect(line1).toContain("2.1.3");
    });

    test("line 1 contains session ID", async () => {
      const result = await defaultTheme(JSON.stringify(baseStatus));
      const line1 = result.split("\n")[0];
      expect(line1).toContain("📃");
      expect(line1).toContain("3694cfa9-53b4-4025-ab41-f8fa913a189b");
    });

    test("line 1 contains project directory", async () => {
      const result = await defaultTheme(JSON.stringify(baseStatus));
      const line1 = result.split("\n")[0];
      expect(line1).toContain("🗂️");
      expect(line1).toContain("statusline");
    });

    test("line 2 contains git status", async () => {
      const result = await defaultTheme(JSON.stringify(baseStatus));
      const line2 = result.split("\n")[1];
      // Should contain one of the git status emojis
      const hasGitStatus =
        line2?.includes("🌿") ||
        line2?.includes("🪾") ||
        line2?.includes("💾") ||
        line2?.includes("💥");
      expect(hasGitStatus).toBe(true);
    });
  });

  describe("usage percentage rendering", () => {
    const createStatusWithUsage = (usedPercentage: number | null) => ({
      session_id: "test-session-id",
      transcript_path: "/home/testuser/.claude/projects/test.jsonl",
      cwd: "/home/testuser/Projects/statusline",
      model: { id: "claude-opus-4-5", display_name: "Opus 4.5" },
      workspace: {
        current_dir: "/home/testuser/Projects/statusline",
        project_dir: "/home/testuser/Projects/statusline",
      },
      version: "2.1.3",
      output_style: { name: "Explanatory" },
      cost: {
        total_cost_usd: 0,
        total_duration_ms: 1345,
        total_api_duration_ms: 0,
        total_lines_added: 0,
        total_lines_removed: 0,
      },
      context_window: {
        total_input_tokens: 100,
        total_output_tokens: 100,
        context_window_size: 200000,
        current_usage: null,
        used_percentage: usedPercentage,
        remaining_percentage: usedPercentage ? 100 - usedPercentage : null,
        vim: { mode: "NORMAL" },
        agent: { name: "main", type: "primary" },
      },
      exceeds_200k_tokens: false,
    });

    test("renders empty string when usage is 0%", async () => {
      const status = createStatusWithUsage(0);
      const result = await defaultTheme(JSON.stringify(status));
      const line2 = result.split("\n")[1];
      expect(line2).not.toContain("0%");
    });

    test("renders empty string when usage is null", async () => {
      const status = createStatusWithUsage(null);
      const result = await defaultTheme(JSON.stringify(status));
      const line2 = result.split("\n")[1];
      expect(line2).not.toContain("%");
    });

    test("renders percentage when usage is 42%", async () => {
      const status = createStatusWithUsage(42);
      const result = await defaultTheme(JSON.stringify(status));
      const line2 = result.split("\n")[1];
      expect(line2).toContain("42%");
    });

    test("renders percentage when usage is 100%", async () => {
      const status = createStatusWithUsage(100);
      const result = await defaultTheme(JSON.stringify(status));
      const line2 = result.split("\n")[1];
      expect(line2).toContain("100%");
    });
  });

  describe("with fixture files", () => {
    test("renders with statusline-1.json (null usage)", async () => {
      const fixture = await Bun.file(
        `${import.meta.dir}/../../fixtures/statusline-1.json`,
      ).json();
      const result = await defaultTheme(JSON.stringify(fixture));
      const lines = result.split("\n");
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain("🤖");
      expect(lines[0]).toContain("📃");
      expect(lines[0]).toContain("🗂️");
    });

    test("renders with statusline-2.json (with usage data)", async () => {
      const fixture = await Bun.file(
        `${import.meta.dir}/../../fixtures/statusline-2.json`,
      ).json();
      const result = await defaultTheme(JSON.stringify(fixture));
      const lines = result.split("\n");
      expect(lines.length).toBe(2);
      // This fixture has 0.38% usage which is displayed as-is (not 0%)
      expect(lines[1]).toContain("0.38%");
    });
  });

  describe("with different model IDs", () => {
    const createStatusWithModel = (modelId: string) => ({
      session_id: "test-session-id",
      transcript_path: "/home/testuser/.claude/projects/test.jsonl",
      cwd: "/home/testuser/Projects/statusline",
      model: { id: modelId, display_name: "Test Model" },
      workspace: {
        current_dir: "/home/testuser/Projects/statusline",
        project_dir: "/home/testuser/Projects/statusline",
      },
      version: "2.1.3",
      output_style: { name: "Explanatory" },
      cost: {
        total_cost_usd: 0,
        total_duration_ms: 1345,
        total_api_duration_ms: 0,
        total_lines_added: 0,
        total_lines_removed: 0,
      },
      context_window: {
        total_input_tokens: 0,
        total_output_tokens: 0,
        context_window_size: 200000,
        current_usage: null,
        used_percentage: null,
        remaining_percentage: null,
        vim: { mode: "NORMAL" },
        agent: { name: "main", type: "primary" },
      },
      exceeds_200k_tokens: false,
    });

    test("abbreviates claude-opus model ID", async () => {
      const status = createStatusWithModel("claude-opus-4-5-20251101");
      const result = await defaultTheme(JSON.stringify(status));
      // Model ID "opus-4-5-20251101" (17 chars) gets truncated to "…-5-20251101" (12 chars)
      expect(result).toContain("…-5-20251101");
    });

    test("abbreviates claude-sonnet model ID", async () => {
      const status = createStatusWithModel("claude-sonnet-4-5-20250929");
      const result = await defaultTheme(JSON.stringify(status));
      // Model ID "sonnet-4-5-20250929" (18 chars) gets truncated to "…-5-20250929" (12 chars)
      expect(result).toContain("…-5-20250929");
    });

    test("passes through non-claude model IDs", async () => {
      const status = createStatusWithModel("gpt-4-turbo");
      const result = await defaultTheme(JSON.stringify(status));
      expect(result).toContain("gpt-4-turbo");
    });
  });

  describe("with different project directories", () => {
    const createStatusWithProjectDir = (projectDir: string) => ({
      session_id: "test-session-id",
      transcript_path: "/home/testuser/.claude/projects/test.jsonl",
      cwd: projectDir,
      model: { id: "claude-opus-4-5", display_name: "Opus 4.5" },
      workspace: {
        current_dir: projectDir,
        project_dir: projectDir,
      },
      version: "2.1.3",
      output_style: { name: "Explanatory" },
      cost: {
        total_cost_usd: 0,
        total_duration_ms: 1345,
        total_api_duration_ms: 0,
        total_lines_added: 0,
        total_lines_removed: 0,
      },
      context_window: {
        total_input_tokens: 0,
        total_output_tokens: 0,
        context_window_size: 200000,
        current_usage: null,
        used_percentage: null,
        remaining_percentage: null,
        vim: { mode: "NORMAL" },
        agent: { name: "main", type: "primary" },
      },
      exceeds_200k_tokens: false,
    });

    test("compresses and telescopes deep paths", async () => {
      const status = createStatusWithProjectDir(
        "/home/testuser/projects/myapp/src/components",
      );
      const result = await defaultTheme(JSON.stringify(status));
      const line1 = result.split("\n")[0];
      expect(line1).toContain("🗂️");
      // Path should be compressed and telescoped
      expect(line1).toContain("components");
    });

    test("handles paths under home directory", async () => {
      const status = createStatusWithProjectDir("/home/testuser/my-project");
      const result = await defaultTheme(JSON.stringify(status));
      const line1 = result.split("\n")[0];
      expect(line1).toContain("🗂️");
      expect(line1).toContain("my-project");
    });
  });
});
