import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  abbreviatePath,
  abbreviateModelId,
  currentBranchName,
  workspaceStatus,
  currentGitStatus,
  currentModelStatus,
  currentSessionId,
} from "./utils";
import type { Status } from "./schema/statusLine";

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
  output_style: {
    name: "plain",
  },
  context_window: {
    total_input_tokens: 0,
    total_output_tokens: 0,
    context_window_size: 200000,
    current_usage: null,
    used_percentage: null,
    remaining_percentage: null,
    vim: { mode: "INSERT" },
    agent: { name: "main", type: "main" },
  },
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
      expect(abbreviatePath("/var/home/testuser/data")).toBe("/…/h/t/data");
    });

    test("handles path immediately under homedir", () => {
      expect(abbreviatePath("/home/testuser/file.txt")).toBe("~/file.txt");
    });
  });

  describe("path abbreviation", () => {
    test("abbreviates all segments except the last", () => {
      expect(abbreviatePath("/foo/bar/baz/etc/last")).toBe("/…/b/e/last");
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

    test("handles deep paths (truncated to tail=3)", () => {
      expect(abbreviatePath("/a/b/c/d/e/f/g/target")).toBe("/…/f/g/target");
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
        "~/C/p/src",
      );
    });
  });

  describe("tail option", () => {
    test("default tail=3 truncates paths with more than 3 segments", () => {
      expect(abbreviatePath("/a/b/c/d/e")).toBe("/…/c/d/e");
    });

    test("default tail=3 keeps paths with 3 or fewer segments intact", () => {
      expect(abbreviatePath("/foo/bar/baz")).toBe("/f/b/baz");
    });

    test("tail=2 keeps only last 2 segments", () => {
      expect(abbreviatePath("/a/b/c/d/e", { tail: 2 })).toBe("/…/d/e");
    });

    test("tail=1 keeps only the last segment", () => {
      expect(abbreviatePath("/a/b/c/target", { tail: 1 })).toBe("/…/target");
    });

    test("tail larger than segment count returns full path", () => {
      expect(abbreviatePath("/foo/bar", { tail: 10 })).toBe("/f/bar");
    });

    test("tail preserves ~ prefix with ellipsis when truncating home paths", () => {
      expect(abbreviatePath("/home/testuser/a/b/c/d", { tail: 2 })).toBe(
        "~/…/c/d",
      );
    });

    test("tail preserves ~ prefix when not truncating home paths", () => {
      expect(abbreviatePath("/home/testuser/Code/myapp", { tail: 3 })).toBe(
        "~/C/myapp",
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

  describe("tail option", () => {
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
        { stdout: "pipe", stderr: "pipe" },
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
        result.startsWith(emoji),
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

describe("workspaceStatus", () => {
  describe("same directory", () => {
    test("returns matching paths when project and current dir match", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/project",
          current_dir: "/home/testuser/project",
        },
      };
      expect(workspaceStatus(status)).toEqual({
        projectDir: "~/project",
        currentDir: "~/project",
      });
    });

    test("abbreviates path segments except last", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/Code/myapp",
          current_dir: "/home/testuser/Code/myapp",
        },
      };
      expect(workspaceStatus(status)).toEqual({
        projectDir: "~/C/myapp",
        currentDir: "~/C/myapp",
      });
    });
  });

  describe("different directories", () => {
    test("returns both abbreviated paths when dirs differ", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/project",
          current_dir: "/home/testuser/other",
        },
      };
      expect(workspaceStatus(status)).toEqual({
        projectDir: "~/project",
        currentDir: "~/other",
      });
    });

    test("abbreviates both paths independently", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/Code/frontend",
          current_dir: "/home/testuser/Code/backend",
        },
      };
      expect(workspaceStatus(status)).toEqual({
        projectDir: "~/C/frontend",
        currentDir: "~/C/backend",
      });
    });

    test("handles deeply nested current directory", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/home/testuser/project",
          current_dir: "/home/testuser/project/src/components",
        },
      };
      expect(workspaceStatus(status)).toEqual({
        projectDir: "~/project",
        currentDir: "~/p/s/components",
      });
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
      const result = workspaceStatus(status);
      expect(result.projectDir).toStartWith("~");
      expect(result.currentDir).toStartWith("~");
    });

    test("handles non-home paths", () => {
      const status = {
        ...defaultStatus,
        workspace: {
          project_dir: "/var/www/app",
          current_dir: "/var/www/app",
        },
      };
      expect(workspaceStatus(status)).toEqual({
        projectDir: "/v/w/app",
        currentDir: "/v/w/app",
      });
    });
  });
});

describe("currentSessionId", () => {
  test("returns session ID without prefix by default", () => {
    expect(currentSessionId(defaultStatus)).toBe("test-session");
  });

  test("returns session ID with emoji prefix when decorated", () => {
    expect(currentSessionId(defaultStatus, { decorate: true })).toBe(
      "📝 test-session",
    );
  });

  test("does not truncate short session IDs", () => {
    const status = { ...defaultStatus, session_id: "abc-123" };
    expect(currentSessionId(status)).toBe("abc-123");
  });

  describe("tail option", () => {
    const longId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const longStatus = { ...defaultStatus, session_id: longId };

    test("default tail=18 truncates long session IDs", () => {
      expect(currentSessionId(longStatus)).toBe("…abcd-ef1234567890");
    });

    test("tail=10 keeps last 9 chars", () => {
      expect(currentSessionId(longStatus, { tail: 10 })).toBe("…234567890");
    });

    test("tail larger than ID length returns full ID", () => {
      expect(currentSessionId(longStatus, { tail: 100 })).toBe(longId);
    });

    test("tail=1 returns only …", () => {
      expect(currentSessionId(longStatus, { tail: 1 })).toBe("…");
    });

    test("truncation with decorate includes prefix", () => {
      expect(currentSessionId(longStatus, { tail: 10, decorate: true })).toBe(
        "📝 …234567890",
      );
    });
  });
});
