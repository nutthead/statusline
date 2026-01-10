import { test, expect, describe } from "bun:test";
import { statusSchema } from "./statusLineSchema";
import { readdirSync } from "node:fs";

const fixturesDir = `${import.meta.dir}/../fixtures`;
const fixtureFiles = readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));

describe("statusLineSchema", () => {
  describe("fixtures validation", () => {
    test.each(fixtureFiles)("%s does not lead to an error", async (filename) => {
      const fixture = await Bun.file(`${fixturesDir}/${filename}`).json();
      const result = statusSchema.safeParse(fixture);

      expect(result.success).toBe(true);
    });

    test.each(fixtureFiles)("%s returns the model ID", async (filename) => {
      const fixture = await Bun.file(`${fixturesDir}/${filename}`).json();
      const result = statusSchema.safeParse(fixture);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model.id).toBeDefined();
        expect(typeof result.data.model.id).toBe("string");
        expect(result.data.model.id.length).toBeGreaterThan(0);
      }
    });
  });
});
