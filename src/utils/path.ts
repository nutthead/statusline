import { homedir } from "node:os";

const HORIZONTAL_ELLIPSIS = "\u2026";

/**
 * Compresses a path by converting all segments except the last to a single character.
 *
 * @param path - The path to compress
 * @returns The compressed path
 *
 * @example compress("/home/username/foo/bar/baz") // "/h/u/f/b/baz"
 * @example compress("/foo/bar/baz")               // "/f/b/baz"
 * @example compress("~/projects/myapp")           // "~/p/myapp"
 * @example compress("a/b/c/d")                    // "a/b/c/d"
 */
function compress(path: string): string {
  const segments = path.split("/");

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

  return compressed.join("/");
}

/**
 * Converts a path starting with the home directory to use `~`.
 *
 * @param path - The path to convert
 * @returns The path with home directory replaced by `~`, or the original path if it doesn't start with home
 *
 * @example tildify("/home/user/projects/myapp") // "~/projects/myapp"
 * @example tildify("/home/user")                // "~"
 * @example tildify("/etc/nginx")                // "/etc/nginx"
 */
function tildify(path: string): string {
  const home = homedir();

  if (path === home) {
    return "~";
  }

  if (path.startsWith(`${home}/`)) {
    return `~${path.slice(home.length)}`;
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
 * @returns The telescoped path
 *
 * @example telescope("/home/user/projects/myapp") // "~/…/myapp"
 * @example telescope("/a/b/c/d")                  // "/a/…/d"
 * @example telescope("~/a/b/c")                   // "~/…/c"
 * @example telescope("a/b/c")                     // "a/…/c"
 * @example telescope("~/foo")                     // "~/foo"
 */
function telescope(path: string): string {
  const tildified = tildify(path);
  const segments = tildified.split("/");

  if (segments.length <= 2) {
    return tildified;
  }

  const first = segments[0];
  const last = segments[segments.length - 1];

  // Handle absolute paths: first segment is empty string
  if (first === "" && segments.length > 1) {
    return `/${segments[1]}/${HORIZONTAL_ELLIPSIS}/${last}`;
  }

  return `${first}/${HORIZONTAL_ELLIPSIS}/${last}`;
}

export { compress, tildify, telescope, HORIZONTAL_ELLIPSIS };
