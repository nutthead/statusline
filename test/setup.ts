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

mock.module("ansi-colors", () => ({
  default: {
    green: (s: string) => s,
    blue: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
  },
}));
