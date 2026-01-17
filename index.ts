import { configure } from "@logtape/logtape";
import { log, logtapeConfig } from "./src/logging";
import { defaultTheme } from "./src/theme/default";

await configure(logtapeConfig);

const input = await Bun.stdin.stream().json();
log.debug("input: {input}", input);
console.log(await defaultTheme(input));
