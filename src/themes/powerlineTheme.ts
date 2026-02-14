import c, { type StyleFunction } from "ansi-colors";
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

type ColorName = "blue" | "magenta" | "cyan" | "green" | "yellow";

interface Segment {
  text: string;
  fg: "white" | "black";
  bg: ColorName;
}

const fgColor: Record<ColorName, StyleFunction> = {
  blue: c.blue,
  magenta: c.magenta,
  cyan: c.cyan,
  green: c.green,
  yellow: c.yellow,
};

const bgColor: Record<ColorName, StyleFunction> = {
  blue: c.bgBlue,
  magenta: c.bgMagenta,
  cyan: c.bgCyan,
  green: c.bgGreen,
  yellow: c.bgYellow,
};

/** Apply foreground and background color to text. */
function styleContent(
  text: string,
  fg: "white" | "black",
  bg: ColorName,
): string {
  const fgFn = fg === "white" ? c.white : c.black;
  return bgColor[bg](fgFn(text));
}

/** Render a separator arrow transitioning from one bg color to another (or to default). */
function styleSep(from: ColorName, to?: ColorName): string {
  const colored = fgColor[from](RPST);
  return to ? bgColor[to](colored) : colored;
}

/** Render an array of segments into a single powerline bar. */
function renderBar(parts: Segment[]): string {
  let result = "";
  let prevBg: ColorName | undefined;
  for (const seg of parts) {
    if (prevBg) {
      result += styleSep(prevBg, seg.bg);
    }
    result += styleContent(` ${seg.text} `, seg.fg, seg.bg);
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
    { text: modelText, fg: "black", bg: "blue" },
    { text: sessionText, fg: "black", bg: "magenta" },
    { text: projectText, fg: "black", bg: "cyan" },
    { text: branchText, fg: "black", bg: "green" },
  ];

  if (usedPercentage > 0) {
    segments.push({ text: `${usedPercentage}%`, fg: "black", bg: "yellow" });
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
