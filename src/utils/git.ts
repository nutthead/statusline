import { type SimpleGit, simpleGit } from "simple-git";
import { match } from "ts-pattern";

/**
 * Result type for currentBranchName function.
 * - `branch`: The current branch name when on a branch
 * - `detached`: In detached HEAD state (checked out a specific commit)
 * - `error`: Failed to get branch info (not a git repo, etc.)
 */
type BranchResult =
  | { status: "none" }
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
      return { status: "none" };
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
    .with({ status: "none" }, () => "💾")
    .with({ status: "error" }, () => "💥")
    .exhaustive();

  return gitStatus;
}

export { currentBranchName, currentGitStatus };
export type { BranchResult };
