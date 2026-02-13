import { homedir } from "node:os";
import { getFileSink } from "@logtape/file";
import { type Config, getLogger } from "@logtape/logtape";

const logtapeConfig: Config<"file", string> = {
  sinks: {
    file: getFileSink(`${homedir()}/.local/state/statusline/app.log`, {
      lazy: true,
    }),
  },
  loggers: [
    {
      category: "statusline",
      lowestLevel: "debug",
      sinks: ["file"],
    },
    {
      category: ["logtape", "meta"],
      sinks: ["file"],
    },
  ],
};

const log = getLogger(["statusline"]);

export { logtapeConfig, log };
