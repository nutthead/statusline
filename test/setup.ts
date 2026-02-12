import { mock } from "bun:test";

mock.module("@logtape/file", () => ({
  getFileSink: () => () => {},
}));
