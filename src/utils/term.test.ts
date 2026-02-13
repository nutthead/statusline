import { describe, expect, test } from "bun:test";
import { getDisplayWidth } from "./term";

describe("getDisplayWidth", () => {
  test("correctly calculates width for model status with emoji", () => {
    const input = "🤖 opus-4.5";
    // 🤖 (2 chars) + space (1) + "opus-4.5" (8) = 11
    expect(getDisplayWidth(input)).toBe(11);
  });

  test("correctly calculates width for session status with ellipsis", () => {
    const input = "📃 …b998-9402fe8c8856";
    // 📃 (2) + space (1) + … (1) + "b998-9402fe8c8856" (17) = 21
    expect(getDisplayWidth(input)).toBe(21);
  });

  test("correctly calculates width for project status with path", () => {
    const input = "🗂️ /h/…/statusline";
    // 🗂️ (2) + space (1) + "/" (1) + "h" (1) + "/" (1) + … (1) + "/" (1) + "statusline" (10) = 19
    expect(getDisplayWidth(input)).toBe(19);
  });

  test("correctly calculates width for branch status with emoji", () => {
    const input = "🌿 master";
    // 🌿 (2) + space (1) + "master" (6) = 9
    expect(getDisplayWidth(input)).toBe(9);
  });
});
