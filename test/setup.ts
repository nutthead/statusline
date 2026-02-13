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
