/**
 * Calculates the display width of a string, accounting for emojis
 * which occupy 2 character columns in terminal displays.
 *
 * @param str - The string to measure
 * @returns The display width in columns
 */
function getDisplayWidth(str: string): number {
  // Remove ANSI codes for width calculation
  const cleanStr = str.replace(/\u001b\[[0-9;]*m/g, "");
  // Count regular characters
  const charCount = Array.from(cleanStr).length;
  // Count emojis (each emoji counts as 2 characters)
  const emojiRegex = /\p{Extended_Pictographic}/gu;
  const emojiCount = (cleanStr.match(emojiRegex) || []).length;
  // Total width = characters + extra count for emojis (since each emoji is 2 wide)
  return charCount + emojiCount;
}

export { getDisplayWidth };
