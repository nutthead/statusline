import { homedir } from "node:os";
import { simpleGit, type SimpleGit } from "simple-git";
import { match } from "ts-pattern";
import type { Status } from "./statusLineSchema";

/**
 * Abbreviates a path by reducing all segments except the last to their first character.
 * If the path starts with the home directory, it's replaced with `~`.
 *
 * @param path - The path to abbreviate
 * @param options.tail - Maximum number of path segments to keep from the end (default: 3).
 *   When the path has more non-empty segments than `tail`, only the last `tail` segments
 *   are shown, prefixed with the path root and `…` to indicate truncation.
 *
 * @example abbreviatePath("/home/user/projects/myapp")       // "~/p/myapp"
 * @example abbreviatePath("/foo/bar/baz/etc/last")           // "/…/b/e/last"
 * @example abbreviatePath("/home/user/a/b/c/d", { tail: 2 }) // "~/…/c/d"
 */
function abbreviatePath(path: string, options?: { tail?: number }): string {
	const tail = options?.tail ?? 3;
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

	// Apply tail: keep only the last `tail` non-empty segments
	const nonEmptyIndices = segments.reduce<number[]>((acc, s, i) => {
		if (s.length > 0) acc.push(i);
		return acc;
	}, []);

	let truncated = false;
	let resultSegments = segments;

	if (nonEmptyIndices.length > tail) {
		const startIndex = nonEmptyIndices[nonEmptyIndices.length - tail];
		resultSegments = segments.slice(startIndex);
		truncated = true;
	}

	const abbreviated = resultSegments.map((segment, index) => {
		// Keep last segment full, abbreviate others to first char (if non-empty)
		if (index === resultSegments.length - 1) return segment;
		return segment.length > 0 ? segment[0] : segment;
	});

	const resultPath = abbreviated.join("/");

	if (truncated) {
		// Preserve the path root (prefix + leading slash, or first segment) with ellipsis
		const firstSeg = segments[0] ?? "";
		const root = firstSeg === "" ? `${prefix}/` : `${prefix}${firstSeg[0]}/`;
		return `${root}…/${resultPath}`;
	}

	return prefix + resultPath;
}

/**
 * Abbreviates a model ID by stripping the "claude-" prefix and truncating
 * to `tail` characters (using `…` prefix when truncated).
 *
 * @param model - The model ID string
 * @param options.tail - Maximum character length of the result (default: 12).
 *
 * @example abbreviateModelId("claude-opus-4.5")           // "opus-4.5"
 * @example abbreviateModelId("some-very-long-model-name") // "…-model-name"
 */
function abbreviateModelId(model: string, options?: { tail?: number }): string {
	const tail = options?.tail ?? 12;

	// Step 1: Strip "claude-" prefix
	const name = model.replace(/^claude-/, "");

	// Step 2: Truncate if needed, keeping the last (tail - 1) chars
	if (name.length <= tail) return name;
	if (tail <= 1) return "…";
	return `…${name.slice(-(tail - 1))}`;
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
function workspaceStatus(status: Status) {
	const projectDir = abbreviatePath(status.workspace.project_dir);
	const currentDir = abbreviatePath(status.workspace.current_dir);
	return { projectDir, currentDir };
}

function currentSessionId(
	status: Status,
	options?: { tail?: number; decorate?: boolean },
) {
	const tail = options?.tail ?? 18;
	const decorate = options?.decorate ?? false;
	const prefix = decorate ? "📝 " : "";
	const id = status.session_id;
	if (id.length <= tail) return `${prefix}${id}`;
	if (tail <= 1) return `${prefix}…`;
	return `${prefix}…${id.slice(-(tail - 1))}`;
}

export {
	abbreviateModelId,
	abbreviatePath,
	currentBranchName,
	workspaceStatus,
	currentGitStatus,
	currentModelStatus,
	currentSessionId,
};

export type { BranchResult };
