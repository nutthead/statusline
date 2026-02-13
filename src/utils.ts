import { homedir } from "node:os";
import type { Status } from "./schema/statusLine";

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
  workspaceStatus,
  currentModelStatus,
  currentSessionId,
};
