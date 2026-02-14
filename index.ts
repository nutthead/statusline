import { configure } from "@logtape/logtape";
import meow from "meow";
import { log, logtapeConfig } from "./src/logging";
import { loadTheme } from "./src/theme/loadTheme";
import { defaultTheme } from "./src/themes/defaultTheme";
import { powerlineTheme } from "./src/themes/powerlineTheme";

await configure(logtapeConfig);

const BUILTIN_THEMES: Record<string, (input?: string) => Promise<string>> = {
  default: defaultTheme,
  powerline: powerlineTheme,
};

const cli = meow(
  `
  Usage
    $ cc-statusline

  Options
    --theme, -t             Use a built-in theme (powerline)
    --theme-file, -f        Use a custom theme file

  Examples
    $ cc-statusline --theme ~/.config/cc-statusline/basic.js
`,
  {
    importMeta: import.meta,
    flags: {
      theme: {
        type: "string",
        shortFlag: "t",
        isRequired: false,
      },
      themeFile: {
        type: "string",
        shortFlag: "f",
        isRequired: false,
      },
    },
  },
);

if (cli.flags.theme && cli.flags.themeFile) {
  console.error("Error: --theme and --theme-file are mutually exclusive");
  process.exit(1);
}

let resolvedTheme: (input?: string) => Promise<string>;
if (cli.flags.theme) {
  const selectedTheme = cli.flags.theme;
  resolvedTheme = BUILTIN_THEMES[selectedTheme] ?? defaultTheme;
} else if (cli.flags.themeFile) {
  const selectedTheme = cli.flags.themeFile;
  resolvedTheme = (await loadTheme(selectedTheme)) || defaultTheme;
} else {
  resolvedTheme = defaultTheme;
}

const input = await Bun.stdin.stream().text();
log.debug("input: {input}", { input });
console.log(await resolvedTheme(input));
