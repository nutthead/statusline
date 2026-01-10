import { test, expect, describe, mock, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock homedir to return a consistent value for testing
mock.module("node:os", () => ({
  homedir: () => "/home/testuser",
}));

// Import after mocking
import { abbreviatePath, abbreviateModelId, currentBranchName } from "./utils";

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

describe("currentBranchName", () => {
  describe("valid git repository", () => {
    test("returns branch name for current repository", async () => {
      // This test uses the actual repo we're in
      const result = await currentBranchName(process.cwd());
      expect(result.status).toBe("branch");
      if (result.status === "branch") {
        expect(result.name).toBe("master");
      }
    });
  });

  describe("non-git directory", () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "git-test-"));
    });

    afterAll(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    test("returns not-git status for non-git directory", async () => {
      const result = await currentBranchName(tempDir);
      expect(result.status).toBe("not-git");
    });
  });

  describe("detached HEAD state", () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "git-detached-"));
      // Initialize a git repo, create a commit, then detach HEAD
      const proc = Bun.spawn(
        [
          "bash",
          "-c",
          `
          cd "${tempDir}" &&
          git init &&
          git config user.email "test@test.com" &&
          git config user.name "Test" &&
          echo "test" > file.txt &&
          git add file.txt &&
          git commit -m "initial" &&
          git checkout --detach HEAD
        `,
        ],
        { stdout: "pipe", stderr: "pipe" }
      );
      await proc.exited;
    });

    afterAll(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    test("returns detached status with commit hash", async () => {
      const result = await currentBranchName(tempDir);
      expect(result.status).toBe("detached");
      if (result.status === "detached") {
        // Commit hash should be 7 characters (short hash)
        expect(result.commit).toMatch(/^[a-f0-9]{7}$/);
      }
    });
  });

  describe("fresh git repository", () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "git-fresh-"));
      const proc = Bun.spawn(["git", "init", tempDir], {
        stdout: "pipe",
        stderr: "pipe",
      });
      await proc.exited;
    });

    afterAll(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    test("returns branch name for fresh repo with no commits", async () => {
      const result = await currentBranchName(tempDir);
      // Fresh repos have a branch but no commits - should still work
      expect(result.status).toBe("branch");
      if (result.status === "branch") {
        // Default branch is typically "master" or "main"
        expect(["master", "main"]).toContain(result.name);
      }
    });
  });
});
