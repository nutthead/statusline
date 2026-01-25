import meow from "meow";
import { configure } from "@logtape/logtape";
import { log, logtapeConfig } from "./src/logging";
import { defaultTheme } from "./src/defaultTheme";
import { loadTheme } from "./src/theme/loadTheme";

await configure(logtapeConfig);

const cli = meow(
  `
	Usage
	  $ cc-statusline

	Options
	  --theme, -t  Use a custom theme

	Examples
	  $ cc-statusline --rainbow
    $ cc-statusline --theme ~/.config/cc-statusline/basic.js
	  
`,
  {
    importMeta: import.meta, // This is required
    flags: {
      theme: {
        type: "string",
        shortFlag: "t",
        isRequired: false,
      },
    },
  },
);

const resolvedTheme = (cli.flags.theme && await loadTheme(cli.flags.theme)) || defaultTheme;

const input = await Bun.stdin.stream().json();
log.debug("input: {input}", input);
console.log(await resolvedTheme(input));
