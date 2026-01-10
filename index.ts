import { getFileSink } from "@logtape/file";
import { configure, getLogger } from "@logtape/logtape";
import { homedir } from "node:os";
import { z } from "zod";
import { statusSchema } from "./src/statusLineSchema";
import { abbreviateModelId, abbreviatePath } from "./src/utils";

await configure({
  sinks: {
    file: getFileSink(`${homedir()}/.local/state/statusline/app.log`),
  },
  loggers: [
    {
      category: "statusline",
      lowestLevel: "info",
      sinks: ["file"],
    },
    {
      category: ["logtape", "meta"],
      sinks: ["file"],
    },
  ],
});

const log = getLogger(["statusline"]);

const input = await Bun.stdin.stream().json();
log.info(input);

const result = statusSchema.safeParse(input);
if (!result.success) {
  log.error("Failed to parse input: {error}", {
    error: JSON.stringify(z.treeifyError(result.error)),
  });
  process.exit(1);
}

const resultData = result.data;

const modelId = abbreviateModelId(resultData.model.id);
const projectDir = abbreviatePath(resultData.workspace.project_dir);
const currentDir = abbreviatePath(resultData.workspace.current_dir);
const dirStatus =
  projectDir === currentDir ? projectDir : `${projectDir}/${currentDir}`;

const statusLine = `[ ${dirStatus} | ${modelId} ]`;

console.log(statusLine);
