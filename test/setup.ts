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

mock.module("ansi-colors", () => {
  const identity = (s: string) => s;
  return {
    default: {
      black: identity,
      white: identity,
      red: identity,
      green: identity,
      yellow: identity,
      blue: identity,
      magenta: identity,
      cyan: identity,
      bgBlue: identity,
      bgMagenta: identity,
      bgCyan: identity,
      bgGreen: identity,
      bgYellow: identity,
    },
  };
});
