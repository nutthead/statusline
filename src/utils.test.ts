import { test, expect, describe, mock } from "bun:test";

// Mock homedir to return a consistent value for testing
mock.module("node:os", () => ({
  homedir: () => "/home/testuser",
}));

// Import after mocking
import { abbreviatePath, abbreviateModelId } from "./utils";

describe("abbreviatePath", () => {
  describe("home directory replacement", () => {
    test("replaces homedir with ~ at start of path", () => {
      expect(abbreviatePath("/home/testuser/projects/myapp")).toBe(
        "~/p/myapp"
      );
    });

    test("returns ~ for exact homedir match", () => {
      expect(abbreviatePath("/home/testuser")).toBe("~");
    });

    test("does not replace homedir if not at start", () => {
      expect(abbreviatePath("/var/home/testuser/data")).toBe("/v/h/t/data");
    });

    test("handles path immediately under homedir", () => {
      expect(abbreviatePath("/home/testuser/file.txt")).toBe("~/file.txt");
    });
  });

  describe("path abbreviation", () => {
    test("abbreviates all segments except the last", () => {
      expect(abbreviatePath("/foo/bar/baz/etc/last")).toBe("/f/b/b/e/last");
    });

    test("keeps single segment paths unchanged", () => {
      expect(abbreviatePath("filename")).toBe("filename");
    });

    test("handles relative paths", () => {
      expect(abbreviatePath("relative/path/here")).toBe("r/p/here");
    });

    test("handles two segment absolute paths", () => {
      expect(abbreviatePath("/etc/nginx")).toBe("/e/nginx");
    });

    test("handles deep paths", () => {
      expect(abbreviatePath("/a/b/c/d/e/f/g/target")).toBe("/a/b/c/d/e/f/g/target");
    });
  });

  describe("edge cases", () => {
    test("handles empty string", () => {
      expect(abbreviatePath("")).toBe("");
    });

    test("handles root path", () => {
      expect(abbreviatePath("/")).toBe("/");
    });

    test("handles path with only one segment after root", () => {
      expect(abbreviatePath("/single")).toBe("/single");
    });

    test("preserves trailing slash behavior", () => {
      // Trailing slash creates empty last segment which is preserved
      expect(abbreviatePath("/foo/bar/")).toBe("/f/b/");
    });

    test("handles homedir with subdirectories", () => {
      expect(abbreviatePath("/home/testuser/Code/project/src")).toBe(
        "~/C/p/src"
      );
    });
  });
});

describe("abbreviateModelId", () => {
  describe("claude prefix removal", () => {
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

  describe("non-claude models", () => {
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

  describe("edge cases", () => {
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
});
