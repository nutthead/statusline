/**
 * Abbreviates a model ID by stripping the "claude-" prefix and truncating
 * to `tail` characters (using `…` prefix when truncated).
 *
 * @param model - The model ID string
 * @param options.tail - Maximum character length of the result (default: 12).
 *
 * @example abbreviateModelId("claude-opus-4.5")           // "opus-4.5"
 * @example abbreviateModelId("some-very-long-model-name") // "…-model-name"
 */
function abbreviateModelId(model: string, options?: { tail?: number }): string {
  const tail = options?.tail ?? 12;

  // Step 1: Strip "claude-" prefix
  const name = model.replace(/^claude-/, "");

  // Step 2: Truncate if needed, keeping the last (tail - 1) chars
  if (name.length <= tail) return name;
  if (tail <= 1) return "…";
  return `…${name.slice(-(tail - 1))}`;
}

export { abbreviateModelId };
