import { homedir } from "node:os";
import { join, resolve } from "node:path";

type ThemeFunction = (input?: string) => Promise<string>;

interface ThemeModule {
  default: ThemeFunction;
}

function expandTilde(path: string) {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }

  return path;
}

function resolvePath(path: string) {
  const expandedPath = expandTilde(path);
  return resolve(expandedPath);
}

async function loadTheme(themePath: string): Promise<ThemeFunction | null> {
  const resovedPath = resolvePath(themePath);

  const module = (await import(resovedPath)) as ThemeModule;

  if (typeof module.default !== `function`) {
    return null;
  }

  return module.default;
}

export { type ThemeModule, type ThemeFunction, loadTheme };
