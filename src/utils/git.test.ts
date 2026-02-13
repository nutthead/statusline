import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { currentBranchName, currentGitStatus } from "./git";

describe("currentBranchName", () => {
  describe("when in a valid git repository", () => {
    test("returns branch name for current repository", async () => {
      // This test uses the actual repo we're in
      const result = await currentBranchName(process.cwd());
      expect(result.status).toBe("branch");
      if (result.status === "branch") {
        expect(result.name).toBe("master");
      }
    });
  });

  describe("when not in a git repository", () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "git-test-"));
    });

    afterAll(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    test("returns none status for non-git directory", async () => {
      const result = await currentBranchName(tempDir);
      expect(result.status).toBe("none");
    });
  });

  describe("when in detached HEAD state", () => {
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

  describe("when in a fresh git repository", () => {
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
  describe("when formatting output", () => {
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
