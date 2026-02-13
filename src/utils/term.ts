const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

/**
 * Calculates the display width of a string, accounting for emojis
 * which occupy 2 character columns in terminal displays.
 *
 * @param str - The string to measure
 * @returns The display width in columns
 */
function getDisplayWidth(str: string): number {
  // 1. Count regular characters
  const charCount = Array.from(str).length;

  // 2. Count emojis (each emoji counts as 2 characters)
  const emojiCount = (str.match(EMOJI_REGEX) || []).length;

  // 3. Total width = characters + extra count for emojis (since each emoji is 2 wide)
  return charCount + emojiCount;
}

export { getDisplayWidth };
