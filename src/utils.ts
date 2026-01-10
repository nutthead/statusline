import { homedir } from "node:os";
import { simpleGit, type SimpleGit } from "simple-git";
import { match } from "ts-pattern";
import type { Status } from "./statusLineSchema";

/**
 * Abbreviates a path by reducing all segments except the last to their first character.
 * If the path starts with the home directory, it's replaced with ~.
 * @example abbreviatePath("/home/user/projects/myapp") // "~/p/myapp"
 * @example abbreviatePath("/foo/bar/baz/etc/last") // "/f/b/b/e/last"
 */
function abbreviatePath(path: string): string {
  const home = homedir();

  // Replace homedir with ~ if path starts with it
  let normalizedPath = path;
  let prefix = "";
  if (path.startsWith(home)) {
    normalizedPath = path.slice(home.length);
    prefix = "~";
  }

  const segments = normalizedPath.split("/");
  if (segments.length <= 1) return prefix + normalizedPath;

  const abbreviated = segments.map((segment, index) => {
    // Keep last segment full, abbreviate others to first char (if non-empty)
    if (index === segments.length - 1) return segment;
    return segment.length > 0 ? segment[0] : segment;
  });

  return prefix + abbreviated.join("/");
}

/**
 * Removes the "claude-" prefix from a model name if present.
 * @example abbreviateModelId("claude-opus-4.5") // "opus-4.5"
 * @example abbreviateModelId("opus-4.5") // "opus-4.5"
 */
function abbreviateModelId(model: string): string {
  return model.startsWith("claude-") ? model.slice(7) : model;
}

/**
 * Result type for currentBranchName function.
 * - `branch`: The current branch name when on a branch
 * - `detached`: In detached HEAD state (checked out a specific commit)
 * - `error`: Failed to get branch info (not a git repo, etc.)
 */
type BranchResult =
  | { status: "not-git" }
  | { status: "branch"; name: string }
  | { status: "detached"; commit: string }
  | { status: "error"; message: string };

/**
 * Gets the current git branch name using simple-git.
 * Handles edge cases like detached HEAD state and non-git directories.
 * @param cwd - Optional working directory (defaults to process.cwd())
 * @returns BranchResult indicating branch name, detached state, or error
 */
async function currentBranchName(cwd?: string): Promise<BranchResult> {
  const git: SimpleGit = simpleGit(cwd);

  try {
    // Check if we're in a git repository first
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return { status: "not-git" };
    }

    const branchSummary = await git.branch();
    const current = branchSummary.current;

    // Detached HEAD: current will be a commit hash or empty
    // In detached state, branchSummary.detached is true
    if (branchSummary.detached) {
      // Get the short commit hash for display
      const shortHash = await git.revparse(["--short", "HEAD"]);
      return { status: "detached", commit: shortHash.trim() };
    }

    // Empty current can happen in fresh repos with no commits
    // Use symbolic-ref as fallback to get the intended branch name
    if (!current) {
      try {
        const symbolicRef = await git.raw(["symbolic-ref", "--short", "HEAD"]);
        const branchName = symbolicRef.trim();
        if (branchName) {
          return { status: "branch", name: branchName };
        }
      } catch {
        // symbolic-ref fails in detached HEAD, but we already checked for that
      }
      return { status: "error", message: "Unable to determine current branch" };
    }

    return { status: "branch", name: current };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return { status: "error", message };
  }
}

/**
 * Returns a formatted git status string with emoji indicators.
 * Uses the current working directory to determine git state.
 *
 * @returns A formatted string:
 *   - `🌿 <branch>` - On a branch (e.g., "🌿 main")
 *   - `🪾 <hash>` - Detached HEAD with short commit hash
 *   - `💾` - Not in a git repository
 *   - `💥` - Error determining git status
 */
async function currentGitStatus() {
  const gitBranch = await currentBranchName();
  const gitStatus = match(gitBranch)
    .with({ status: "branch" }, ({ name }) => `🌿 ${name}`)
    .with({ status: "detached" }, ({ commit }) => `🪾 ${commit}`)
    .with({ status: "not-git" }, () => "💾")
    .with({ status: "error" }, () => "💥")
    .exhaustive();

  return gitStatus;
}

/**
 * Returns a formatted model status string with the Claude icon.
 * Strips the "claude-" prefix from the model ID for brevity.
 *
 * @param status - The Status object containing model information
 * @returns A formatted string like "⏣ opus-4.5" or "⏣ sonnet-4"
 */
function currentModelStatus(status: Status) {
  return `⏣ ${abbreviateModelId(status.model.id)}`;
}

/**
 * Returns a formatted directory status string showing workspace location.
 * Both paths are abbreviated (e.g., "/home/user/projects" → "~/p").
 *
 * @param status - The Status object containing workspace information
 * @returns Either the abbreviated project directory alone (when current dir matches),
 *          or "projectDir/currentDir" format when projectDir/currentDir don't match
 * @example currentDirStatus({...}) // "🗂️ ~/p/myapp" or "🗂️ ~/p/myapp 📂 ~/s/components"
 */
function currentDirStatus(status: Status) {
  const projectDir = abbreviatePath(status.workspace.project_dir);
  const currentDir = abbreviatePath(status.workspace.current_dir);
  const dirStatus =
    projectDir === currentDir
      ? `🗂️ ${projectDir}`
      : `🗂️ ${projectDir} 📂 ${currentDir}`;

  return dirStatus;
}

export {
  abbreviateModelId,
  abbreviatePath,
  currentBranchName,
  currentDirStatus,
  currentGitStatus,
  currentModelStatus,
};

export type { BranchResult };
