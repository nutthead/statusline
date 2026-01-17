import { z } from "zod";
import { log } from "../logging";
import { statusSchema } from "../statusLineSchema";
import {
  currentDirStatus,
  currentGitStatus,
  currentModelStatus,
  currentSessionId,
} from "../utils";

import c from "ansi-colors";

async function defaultTheme(input?: string) {
  let statusLine = null;

  if (input) {
    const result = statusSchema.safeParse(input);

    if (result.success) {
      const status = result.data;
      const dirStatus = c.blue(currentDirStatus(status));
      const gitStatus = c.green(await currentGitStatus());
      const modelStatus = c.magenta(currentModelStatus(status));
      const sessionId = c.blue(currentSessionId(status));
      const separator = c.bold.gray(" ⋮ ");

      statusLine = [dirStatus, gitStatus].join(separator);
      statusLine += "\n" + [modelStatus, sessionId].join(separator);
    } else {
      log.error("Failed to parse input: {error}", {
        error: JSON.stringify(z.treeifyError(result.error)),
      });
      statusLine = `[malformed status]`;
    }
  } else {
    statusLine = `[no status]`;
  }

  return statusLine;
}

export { defaultTheme };
