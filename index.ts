import { getFileSink } from "@logtape/file";
import { configure, getLogger } from "@logtape/logtape";
import { homedir } from "node:os";
import { z } from "zod";
import { statusSchema } from "./src/statusLineSchema";

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

console.log(result.data.model.id);
