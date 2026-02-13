import { test, expect, describe } from "bun:test";
import { tildify, telescope, HORIZONTAL_ELLIPSIS } from "./path";

describe("tildify", () => {
  test("replaces home directory with ~", () => {
    expect(tildify("/home/testuser/projects/myapp")).toBe("~/projects/myapp");
  });

  test("returns ~ for exact home directory match", () => {
    expect(tildify("/home/testuser")).toBe("~");
  });

  test("returns path unchanged if not under home directory", () => {
    expect(tildify("/etc/nginx")).toBe("/etc/nginx");
  });

  test("handles path immediately under home directory", () => {
    expect(tildify("/home/testuser/file.txt")).toBe("~/file.txt");
  });

  test("handles deeply nested paths under home", () => {
    expect(tildify("/home/testuser/a/b/c/d/e")).toBe("~/a/b/c/d/e");
  });

  test("returns empty string for empty input", () => {
    expect(tildify("")).toBe("");
  });

  test("returns root path unchanged", () => {
    expect(tildify("/")).toBe("/");
  });

  test("handles path that looks like home but is not", () => {
    expect(tildify("/var/home/testuser/data")).toBe("/var/home/testuser/data");
  });

  test("handles relative paths unchanged", () => {
    expect(tildify("relative/path")).toBe("relative/path");
  });
});

describe("telescope", () => {
  test("telescopes tildified paths with home directory", () => {
    expect(telescope("/home/testuser/projects/myapp")).toBe(`~/\u2026/myapp`);
  });

  test("telescopes absolute paths not under home", () => {
    expect(telescope("/a/b/c/d")).toBe("/a/…/d");
  });

  test("telescopes already tildified paths", () => {
    expect(telescope("~/a/b/c")).toBe("~/…/c");
  });

  test("telescopes relative paths", () => {
    expect(telescope("a/b/c")).toBe("a/…/c");
  });

  test("returns path unchanged when only 2 segments (tildified)", () => {
    expect(telescope("~/foo")).toBe("~/foo");
  });

  test("returns path unchanged when only 1 segment", () => {
    expect(telescope("foo")).toBe("foo");
  });

  test("handles exact home directory", () => {
    expect(telescope("/home/testuser")).toBe("~");
  });

  test("returns empty string for empty input", () => {
    expect(telescope("")).toBe("");
  });

  test("returns root path unchanged", () => {
    expect(telescope("/")).toBe("/");
  });

  test("handles deeply nested paths", () => {
    expect(telescope("/a/b/c/d/e/f/g")).toBe("/a/…/g");
  });

  test("handles deeply nested paths under home", () => {
    expect(telescope("/home/testuser/a/b/c/d/e")).toBe("~/…/e");
  });
});

describe("HORIZONTAL_ELLIPSIS", () => {
  test("is the horizontal ellipsis character (U+2026)", () => {
    expect(HORIZONTAL_ELLIPSIS).toBe("…");
  });
});
