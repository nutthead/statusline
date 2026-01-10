import { getFileSink } from "@logtape/file";
import { configure, getLogger } from "@logtape/logtape";
import { homedir } from "node:os";
import { z } from "zod";
import { statusSchema } from "./src/statusLineSchema";
import {
  abbreviateModelId,
  abbreviatePath,
  currentBranchName,
} from "./src/utils";
import { match } from "ts-pattern";

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
const gitBranch = await currentBranchName();
const gitStatus = match(gitBranch)
  .with({ status: "branch" }, ({ name }) => `🌿 ${name}`)
  .with({ status: "detached" }, ({ commit }) => `🪾 ${commit}`)
  .with({ status: "not-git" }, () => "💾")
  .with({ status: "error" }, () => "💥")
  .exhaustive();

const modelId = abbreviateModelId(resultData.model.id);
const projectDir = abbreviatePath(resultData.workspace.project_dir);
const currentDir = abbreviatePath(resultData.workspace.current_dir);
const dirStatus =
  projectDir === currentDir ? projectDir : `${projectDir}/${currentDir}`;

const statusLine = `[ ${dirStatus} | ${gitStatus} | ⏣ ${modelId} ]`;

console.log(statusLine);
