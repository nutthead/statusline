import { test, expect, describe } from "bun:test";
import { statusSchema } from "./statusLineSchema";
import { readdirSync } from "node:fs";

const fixturesDir = `${import.meta.dir}/../fixtures`;
const fixtureFiles = readdirSync(fixturesDir).filter((f) =>
  f.endsWith(".json")
);

describe("statusLineSchema", () => {
  describe("fixtures validation", () => {
    test.each(fixtureFiles)(
      "%s does not lead to an error",
      async (filename) => {
        const fixture = await Bun.file(`${fixturesDir}/${filename}`).json();
        const result = statusSchema.safeParse(fixture);

        expect(result.success).toBe(true);
      }
    );
  });
});
