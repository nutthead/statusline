import { test, expect, describe } from "bun:test";
import { statusSchema } from "./statusLine";
import { readdirSync } from "node:fs";

const fixturesDir = `${import.meta.dir}/../../fixtures`;
const fixtureFiles = readdirSync(fixturesDir).filter((f) =>
  f.endsWith(".json"),
);

describe("statusLineSchema", () => {
  describe("fixtures validation", () => {
    test.each(
      fixtureFiles,
    )("%s does not lead to an error", async (filename) => {
      const fixture = await Bun.file(`${fixturesDir}/${filename}`).json();
      const result = statusSchema.safeParse(fixture);

      expect(result.success).toBe(true);
    });
  });

  describe("optional fields", () => {
    test("accepts missing vim field", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const { vim, ...contextWithoutVim } = fixture.context_window;
      const fixtureWithoutVim = {
        ...fixture,
        context_window: contextWithoutVim,
      };

      const result = statusSchema.safeParse(fixtureWithoutVim);

      expect(result.success).toBe(true);
    });

    test("accepts missing agent field", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const { agent, ...contextWithoutAgent } = fixture.context_window;
      const fixtureWithoutAgent = {
        ...fixture,
        context_window: contextWithoutAgent,
      };

      const result = statusSchema.safeParse(fixtureWithoutAgent);

      expect(result.success).toBe(true);
    });

    test("accepts both vim and agent missing", async () => {
      const fixture = await Bun.file(`${fixturesDir}/statusline-1.json`).json();
      const { vim, agent, ...contextWithoutBoth } = fixture.context_window;
      const fixtureWithoutBoth = {
        ...fixture,
        context_window: contextWithoutBoth,
      };

      const result = statusSchema.safeParse(fixtureWithoutBoth);

      expect(result.success).toBe(true);
    });
  });
});
