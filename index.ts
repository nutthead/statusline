import { getFileSink } from "@logtape/file";
import { configure, getLogger } from "@logtape/logtape";
import { homedir } from "node:os";
import { z } from "zod";
import { statusSchema, type Status } from "./src/statusLineSchema";

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

let input = await Bun.stdin.stream().json();
log.info(input);

const json = statusSchema.safeParse(input);
if (!json.success) {
  const error = JSON.stringify(z.treeifyError(json.error));
  log.error("Failed to parse input: {error}", { error });
  process.exit(1);
}

const status: Status = json.data;

console.log(`${status.model.id}`);
