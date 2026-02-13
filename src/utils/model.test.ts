import { describe, expect, test } from "bun:test";
import { abbreviateModelId } from "./model";

describe("abbreviateModelId", () => {
  describe("when removing claude prefix", () => {
    test("removes claude- prefix from model name", () => {
      expect(abbreviateModelId("claude-opus-4.5")).toBe("opus-4.5");
    });

    test("removes claude- prefix from sonnet model", () => {
      expect(abbreviateModelId("claude-sonnet-4")).toBe("sonnet-4");
    });

    test("removes claude- prefix from haiku model", () => {
      expect(abbreviateModelId("claude-haiku-3.5")).toBe("haiku-3.5");
    });
  });

  describe("when handling non-claude models", () => {
    test("returns non-claude model unchanged", () => {
      expect(abbreviateModelId("gpt-4")).toBe("gpt-4");
    });

    test("returns model without prefix unchanged", () => {
      expect(abbreviateModelId("opus-4.5")).toBe("opus-4.5");
    });

    test("does not match partial claude prefix", () => {
      expect(abbreviateModelId("claud-model")).toBe("claud-model");
    });

    test("does not match claude without hyphen", () => {
      expect(abbreviateModelId("claudemodel")).toBe("claudemodel");
    });
  });

  describe("when handling edge cases", () => {
    test("handles empty string", () => {
      expect(abbreviateModelId("")).toBe("");
    });

    test("handles just the prefix", () => {
      expect(abbreviateModelId("claude-")).toBe("");
    });

    test("is case-sensitive (uppercase not matched)", () => {
      expect(abbreviateModelId("Claude-opus")).toBe("Claude-opus");
    });

    test("only removes prefix once", () => {
      expect(abbreviateModelId("claude-claude-test")).toBe("claude-test");
    });
  });

  describe("when using tail option", () => {
    test("default tail=12 does not truncate short model IDs", () => {
      expect(abbreviateModelId("claude-opus-4.5")).toBe("opus-4.5");
    });

    test("default tail=12 truncates long model IDs", () => {
      expect(abbreviateModelId("some-very-long-model-name")).toBe(
        "…-model-name",
      );
    });

    test("truncates with … prefix when exceeding tail", () => {
      expect(abbreviateModelId("claude-opus-4.5", { tail: 5 })).toBe("…-4.5");
    });

    test("tail larger than result length returns full result", () => {
      expect(abbreviateModelId("claude-opus-4.5", { tail: 50 })).toBe(
        "opus-4.5",
      );
    });

    test("tail=1 returns only …", () => {
      expect(abbreviateModelId("claude-opus-4.5", { tail: 1 })).toBe("…");
    });
  });
});
