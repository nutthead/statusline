import { configure } from "@logtape/logtape";
import { z } from "zod";
import { log, logtapeConfig } from "./src/logging";
import { statusSchema } from "./src/statusLineSchema";
import {
  currentDirStatus,
  currentGitStatus,
  currentModelStatus,
  currentSessionId,
} from "./src/utils";

import c from "ansi-colors";

await configure(logtapeConfig);

let statusLine = null;
const input = await Bun.stdin.stream().json();
log.debug("input: {input}", input);

if (input) {
  const result = statusSchema.safeParse(input);

  if (result.success) {
    const status = result.data;
    const dirStatus = c.blue(currentDirStatus(status));
    const gitStatus = c.green(await currentGitStatus());
    const modelStatus = c.magenta(currentModelStatus(status));
    const sessionId = c.blue(currentSessionId(status));
    const separator = c.bold.gray("⋮");

    statusLine = `${dirStatus} ${separator} ${gitStatus}\n${modelStatus} ${separator} ${sessionId}`;
  } else {
    log.error("Failed to parse input: {error}", {
      error: JSON.stringify(z.treeifyError(result.error)),
    });
    statusLine = `[malformed status]`;
  }
} else {
  statusLine = `[no status]`;
}

console.log(statusLine);
