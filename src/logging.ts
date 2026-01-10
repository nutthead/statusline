import { getFileSink } from "@logtape/file";
import { getLogger, type Config } from "@logtape/logtape";
import { homedir } from "node:os";

const logtapeConfig: Config<"file", string> = {
  sinks: {
    file: getFileSink(`${homedir()}/.local/state/statusline/app.log`),
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
