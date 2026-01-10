import { test, expect, describe, mock, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock homedir to return a consistent value for testing
mock.module("node:os", () => ({
  homedir: () => "/home/testuser",
}));

// Import after mocking
import {
  abbreviatePath,
  abbreviateModelId,
  currentBranchName,
  currentDirStatus,
  currentGitStatus,
  currentModelStatus,
} from "./utils";
import type { Status } from "./statusLineSchema";

/** Default Status fixture with sensible test values */
const defaultStatus: Status = {
  session_id: "test-session",
  transcript_path: "/tmp/transcript.json",
  cwd: "/test/cwd",
  model: {
    id: "claude-opus-4.5",
    display_name: "Test Model",
  },
  workspace: {
    project_dir: "/home/testuser/project",
    current_dir: "/home/testuser/project",
  },
  version: "1.0.0",
  cost: {
    total_cost_usd: 0,
    total_duration_ms: 0,
    total_api_duration_ms: 0,
    total_lines_added: 0,
    total_lines_removed: 0,
  },
  context_window: null,
};

describe("abbreviatePath", () => {
  describe("home directory replacement", () => {
    test("replaces homedir with ~ at start of path", () => {
      expect(abbreviatePath("/home/testuser/projects/myapp")).toBe("~/p/myapp");
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
      expect(abbreviatePath("/a/b/c/d/e/f/g/target")).toBe(
        "/a/b/c/d/e/f/g/target"
      );
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

describe("currentGitStatus", () => {
  describe("output format", () => {
    test("returns branch emoji format in current repository", async () => {
      // Since we're in a git repo on master branch
      const result = await currentGitStatus();
      expect(result).toBe("🌿 master");
    });

    test("returns a non-empty string", async () => {
      const result = await currentGitStatus();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    test("result starts with one of the expected emojis", async () => {
      const result = await currentGitStatus();
      // Should start with 🌿, 🪾, 💾, or 💥
      const validPrefixes = ["🌿", "🪾", "💾", "💥"];
      const startsWithValidEmoji = validPrefixes.some((emoji) =>
        result.startsWith(emoji)
      );
      expect(startsWithValidEmoji).toBe(true);
    });
  });
});

describe("currentModelStatus", () => {
  describe("Claude models", () => {
    test("formats opus model with icon and strips claude- prefix", () => {
      const status = {
        ...defaultStatus,
        model: { ...defaultStatus.model, id: "claude-opus-4.5" },
      };
      expect(currentModelStatus(status)).toBe("⏣ opus-4.5");
    });

    test("formats sonnet model with icon and strips claude- prefix", () => {
      const status = {
        ...defaultStatus,
        model: { ...defaultStatus.model, id: "claude-sonnet-4" },
      };
      expect(currentModelStatus(status)).toBe("⏣ sonnet-4");
    });

    test("formats haiku model with icon and strips claude- prefix", () => {
      const status = {
        ...defaultStatus,
        model: { ...defaultStatus.model, id: "claude-haiku-3.5" },
      };
      expect(currentModelStatus(status)).toBe("⏣ haiku-3.5");
    });
  });

  describe("non-Claude models", () => {
    test("formats non-Claude model without modification", () => {
      const status = {
        ...defaultStatus,
        model: { ...defaultStatus.model, id: "gpt-4-turbo" },
      };
      expect(currentModelStatus(status)).toBe("⏣ gpt-4-turbo");
    });

    test("keeps model name when already without claude- prefix", () => {
      const status = {
        ...defaultStatus,
        model: { ...defaultStatus.model, id: "opus-4.5" },
      };
      expect(currentModelStatus(status)).toBe("⏣ opus-4.5");
    });
  });

  describe("output format", () => {
    test("always starts with Model icon", () => {
      const status = {
        ...defaultStatus,
        model: { ...defaultStatus.model, id: "any-model" },
      };
      expect(currentModelStatus(status)).toStartWith("⏣ ");
    });

    test("returns string type", () => {
      const status = {
        ...defaultStatus,
        model: { ...defaultStatus.model, id: "claude-opus-4.5" },
      };
      expect(typeof currentModelStatus(status)).toBe("string");
    });
  });

  describe("edge cases", () => {
    test("handles empty model id", () => {
      const status = {
        ...defaultStatus,
        model: { ...defaultStatus.model, id: "" },
      };
      expect(currentModelStatus(status)).toBe("⏣ ");
    });

    test("handles model id that is just 'claude-'", () => {
      const status = {
        ...defaultStatus,
        model: { ...defaultStatus.model, id: "claude-" },
      };
      expect(currentModelStatus(status)).toBe("⏣ ");
    });
  });
});

describe("currentDirStatus", () => {
  describe("same directory", () => {
    test("returns single path when project and current dir match", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/project",
          current_dir: "/home/testuser/project",
        },
      };
      expect(currentDirStatus(status)).toBe("🗂️ ~/project");
    });

    test("abbreviates path segments except last", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/Code/myapp",
          current_dir: "/home/testuser/Code/myapp",
        },
      };
      expect(currentDirStatus(status)).toBe("🗂️ ~/C/myapp");
    });
  });

  describe("different directories", () => {
    test("returns both paths with separator when dirs differ", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/project",
          current_dir: "/home/testuser/other",
        },
      };
      expect(currentDirStatus(status)).toBe("🗂️ ~/project 📂 ~/other");
    });

    test("abbreviates both paths independently", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/Code/frontend",
          current_dir: "/home/testuser/Code/backend",
        },
      };
      expect(currentDirStatus(status)).toBe("🗂️ ~/C/frontend 📂 ~/C/backend");
    });

    test("handles deeply nested current directory", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/project",
          current_dir: "/home/testuser/project/src/components",
        },
      };
      expect(currentDirStatus(status)).toBe("🗂️ ~/project 📂 ~/p/s/components");
    });
  });

  describe("path abbreviation", () => {
    test("replaces home directory with ~", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/myapp",
          current_dir: "/home/testuser/myapp",
        },
      };
      expect(currentDirStatus(status)).toStartWith("🗂️ ~");
    });

    test("handles non-home paths", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/var/www/app",
          current_dir: "/var/www/app",
        },
      };
      expect(currentDirStatus(status)).toBe("🗂️ /v/w/app");
    });
  });

  describe("output format", () => {
    test("returns string type", () => {
      expect(typeof currentDirStatus(defaultStatus)).toBe("string");
    });

    test("uses folder emoji as separator for different directories", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/a",
          current_dir: "/home/testuser/b",
        },
      };
      expect(currentDirStatus(status)).toContain(" 📂 ");
    });
  });
});
