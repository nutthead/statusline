import { ZodError } from "zod";
import { log } from "../logging";
import { statusSchema, type Status } from "../schema/statusLine";
import {
  workspaceStatus,
  currentModelStatus,
  currentSessionId,
} from "../utils";
import { currentGitStatus } from "../utils/git";

import c from "ansi-colors";
import { telescope } from "../utils/path";

function makeDirStatus(status: Status) {
  const workspace = workspaceStatus(status);
  const projectDir = telescope(workspace.projectDir);
  const currentDir = telescope(workspace.currentDir);

  const dirStatus =
    projectDir === currentDir
      ? c.blue(`🗂️ ${projectDir}`)
      : c.blue(`🗂️ ${projectDir} 📂 ${currentDir}`);

  return dirStatus;
}

async function renderTheme(status: Status): Promise<string> {
  const dirStatus = makeDirStatus(status);
  const git = c.green(await currentGitStatus());
  const model = c.magenta(currentModelStatus(status));
  const sessionId = c.blue(currentSessionId(status, { decorate: true }));
  const separator = c.bold.gray(" ⋮ ");
  const statusLine = [
    [dirStatus, git],
    [model, sessionId],
  ];

  return statusLine.map((row) => row.join(separator)).join("\n");
}

async function defaultTheme(input?: string): Promise<string> {
  if (input) {
    try {
      const status = statusSchema.parse(input);
      return renderTheme(status);
    } catch (e) {
      if (e instanceof ZodError) {
        log.error("Failed to parse input: {error}", {
          error: JSON.stringify(e.issues),
        });
      }
    }
  }

  return "";
}

export { defaultTheme };
