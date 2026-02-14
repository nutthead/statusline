import { homedir } from "node:os";

const HORIZONTAL_ELLIPSIS = "\u2026";

/**
 * Compresses a path by converting all segments except the last to a single character.
 *
 * @param path - The path to compress
 * @param separator - The path separator to use (defaults to "/")
 * @returns The compressed path
 *
 * @example compress("/home/username/foo/bar/baz") // "/h/u/f/b/baz"
 * @example compress("/foo/bar/baz")               // "/f/b/baz"
 * @example compress("~/projects/myapp")           // "~/p/myapp"
 * @example compress("a/b/c/d")                    // "a/b/c/d"
 */
function compress(path: string, separator = "/"): string {
  const segments = path.split(separator);

  if (segments.length <= 1) {
    return path;
  }

  const compressed = segments.map((segment, index) => {
    // Keep last segment full, compress others to first char
    if (index === segments.length - 1) return segment;

    // For empty segments (absolute path root), keep empty
    if (segment === "") return segment;

    return segment[0];
  });

  return compressed.join(separator);
}

/**
 * Converts a path starting with the home directory to use `~`.
 *
 * @param path - The path to convert
 * @param separator - The path separator to use (defaults to "/")
 * @returns The path with home directory replaced by `~`, or the original path if it doesn't start with home
 *
 * @example tildify("/home/user/projects/myapp") // "~/projects/myapp"
 * @example tildify("/home/user")                // "~"
 * @example tildify("/etc/nginx")                // "/etc/nginx"
 */
function tildify(path: string, separator = "/"): string {
  const home = homedir();

  if (path === home) {
    return "~";
  }

  if (path.startsWith(`${home}${separator}`)) {
    return `~${separator}${path.slice(home.length + separator.length)}`;
  }

  return path;
}

/**
 * Telescopes a path by keeping only the first and last segments,
 * with a horizontal ellipsis in between.
 *
 * First tildifies the path, then applies the telescoping transformation.
 * If the path has 2 or fewer segments, it is returned unchanged.
 *
 * @param path - The path to telescope
 * @param separator - The path separator to use (defaults to "/")
 * @returns The telescoped path
 *
 * @example telescope("/home/user/projects/myapp") // "~/…/myapp"
 * @example telescope("/a/b/c/d")                  // "/a/…/d"
 * @example telescope("~/a/b/c")                   // "~/…/c"
 * @example telescope("a/b/c")                     // "a/…/c"
 * @example telescope("~/foo")                     // "~/foo"
 */
function telescope(path: string, separator = "/"): string {
  const tildified = tildify(path, separator);
  const segments = tildified.split(separator);

  if (segments.length <= 2) {
    return tildified;
  }

  const first = segments[0];
  const last = segments[segments.length - 1];

  // Handle absolute paths: first segment is empty string
  if (first === "" && segments.length > 1) {
    return `${separator}${segments[1]}${separator}${HORIZONTAL_ELLIPSIS}${separator}${last}`;
  }

  return `${first}${separator}${HORIZONTAL_ELLIPSIS}${separator}${last}`;
}

export { compress, tildify, telescope, HORIZONTAL_ELLIPSIS };
