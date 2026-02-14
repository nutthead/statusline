import { mock } from "bun:test";

mock.module("@logtape/file", () => ({
  getFileSink: () => () => {},
}));

mock.module("node:os", () => ({
  ...require("node:os"),
  homedir: () => "/home/testuser",
}));

mock.module("terminal-size", () => ({
  default: () => ({ columns: 123, rows: 24 }),
}));

mock.module("chalk", () => {
  const identity = (s: string) => s;
  const rgbIdentity = (..._args: number[]) => identity;
  return {
    default: {
      // Used by defaultTheme (named ANSI colors)
      red: identity,
      green: identity,
      yellow: identity,
      blue: identity,
      // Used by powerlineTheme (RGB colors)
      white: identity,
      rgb: rgbIdentity,
      bgRgb: rgbIdentity,
    },
  };
});
