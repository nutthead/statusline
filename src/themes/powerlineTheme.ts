import chalk from "chalk";
import terminalSize from "terminal-size";
import { match } from "ts-pattern";
import { ZodError } from "zod";
import { log } from "../logging";
import { type Status, statusSchema } from "../schema/statusLine";
import { currentBranchName } from "../utils/git";
import { abbreviateModelId } from "../utils/model";
import { compress, telescope } from "../utils/path";
import { getDisplayWidth } from "../utils/term";

// Right-pointing solid triangle (filled separator)
const RPST = "\uE0B0";

type Rgb = [number, number, number];

interface Segment {
  text: string;
  bg: Rgb;
}

// Muted dark background colors for each segment type
const BG_MODEL: Rgb = [30, 40, 80];
const BG_SESSION: Rgb = [60, 30, 70];
const BG_PROJECT: Rgb = [25, 65, 75];
const BG_GIT: Rgb = [30, 65, 40];
const BG_USAGE: Rgb = [85, 70, 20];

/** Apply white foreground and RGB background color to text. */
function styleContent(text: string, bg: Rgb): string {
  return chalk.bgRgb(...bg)(chalk.white(text));
}

/** Render a separator arrow transitioning from one bg color to another (or to default). */
function styleSep(from: Rgb, to?: Rgb): string {
  const arrow = chalk.rgb(...from)(RPST);
  return to ? chalk.bgRgb(...to)(arrow) : arrow;
}

/** Render an array of segments into a single powerline bar. */
function renderBar(parts: Segment[]): string {
  let result = "";
  let prevBg: Rgb | undefined;
  for (const seg of parts) {
    if (prevBg) {
      result += styleSep(prevBg, seg.bg);
    }
    result += styleContent(` ${seg.text} `, seg.bg);
    prevBg = seg.bg;
  }
  if (prevBg) {
    result += styleSep(prevBg);
  }
  return result;
}

/** Lay out segments across lines, wrapping when a segment would exceed maxWidth. */
function layoutSegments(segments: Segment[], maxWidth: number): string {
  const lines: string[] = [];
  let currentParts: Segment[] = [];
  let projectedWidth = 0;

  for (const seg of segments) {
    const contentWidth = getDisplayWidth(` ${seg.text} `);

    if (projectedWidth === 0) {
      // First segment on this line
      projectedWidth = contentWidth + 1;
      currentParts.push(seg);
    } else if (projectedWidth + contentWidth + 1 <= maxWidth) {
      // Fits on current line
      projectedWidth += contentWidth + 1;
      currentParts.push(seg);
    } else {
      // Doesn't fit — close current line and start a new one
      lines.push(renderBar(currentParts));
      currentParts = [seg];
      projectedWidth = contentWidth + 1;
    }
  }

  if (currentParts.length > 0) {
    lines.push(renderBar(currentParts));
  }

  return lines.join("\n");
}

async function renderLine1(status: Status): Promise<string> {
  const modelId = abbreviateModelId(status.model.id);
  const modelText = `🤖 ${modelId} (${status.version})`;

  const sessionText = `📃 ${status.session_id}`;

  const projectDir = compress(telescope(status.workspace.project_dir));
  const projectText = `🗂️ ${projectDir}`;

  const branch = await currentBranchName();
  const branchText = match(branch)
    .with({ status: "none" }, () => `💾`)
    .with({ status: "branch" }, ({ name }) => `🌿 ${name}`)
    .with({ status: "detached" }, ({ commit }) => `🪾 ${commit}`)
    .with({ status: "error" }, () => `💥`)
    .exhaustive();

  const usedPercentage = status.context_window.used_percentage ?? 0;

  const segments: Segment[] = [
    { text: modelText, bg: BG_MODEL },
    { text: sessionText, bg: BG_SESSION },
    { text: projectText, bg: BG_PROJECT },
    { text: branchText, bg: BG_GIT },
  ];

  if (usedPercentage > 0) {
    segments.push({ text: `${usedPercentage}%`, bg: BG_USAGE });
  }

  const maxWidth = terminalSize().columns;
  return layoutSegments(segments, maxWidth);
}

async function renderTheme(status: Status): Promise<string> {
  return renderLine1(status);
}

async function powerlineTheme(input?: string): Promise<string> {
  if (input) {
    try {
      const parsed = JSON.parse(input);
      const status = statusSchema.parse(parsed);
      return renderTheme(status);
    } catch (e) {
      const error =
        e instanceof ZodError
          ? JSON.stringify(e.issues)
          : e instanceof Error
            ? e.message
            : JSON.stringify(e);

      log.error("Failed to parse input: {error}", {
        error: error,
      });
    }
  }

  return "";
}

export { powerlineTheme };
