import { homedir } from "node:os";

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

export { abbreviatePath, abbreviateModelId };
