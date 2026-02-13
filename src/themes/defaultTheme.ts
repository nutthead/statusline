import c from "ansi-colors";
import terminalSize from "terminal-size";
import { match } from "ts-pattern";
import { ZodError } from "zod";
import { log } from "../logging";
import { type Status, statusSchema } from "../schema/statusLine";
import { currentBranchName } from "../utils/git";
import { abbreviateModelId } from "../utils/model";
import { compress, telescope } from "../utils/path";
import { getDisplayWidth } from "../utils/term";

const HORIZONTAL_PADDING = 4;

function colorizeUsageStatus(usedPercentage: number) {
  if (usedPercentage === 0) {
    return "";
  } else if (usedPercentage <= 50) {
    return c.green(`${usedPercentage}%`);
  } else if (usedPercentage <= 75) {
    return c.blue(`${usedPercentage}%`);
  } else if (usedPercentage <= 87.5) {
    return c.yellow(`${usedPercentage}%`);
  } else {
    return c.red(`${usedPercentage}%`);
  }
}

async function renderLine1(status: Status): Promise<string> {
  const modelId = abbreviateModelId(status.model.id);
  const modelStatus = `🤖 ${modelId} (${status.version})`;

  const sessionStatus = `📃 ${status.session_id}`;

  const projectDir = telescope(compress(status.workspace.project_dir));
  const projectStatus = `🗂️ ${projectDir}`;

  const statusWidth = terminalSize().columns - HORIZONTAL_PADDING;
  const modelWidth = getDisplayWidth(modelStatus);
  const sessionWidth = getDisplayWidth(sessionStatus);
  const projectWidth = getDisplayWidth(projectStatus);

  const remainingSpace = statusWidth - modelWidth - sessionWidth - projectWidth;
  const leftGap = Math.floor(remainingSpace / 2);
  const rightGap = Math.ceil(remainingSpace / 2);

  return (
    modelStatus +
    " ".repeat(leftGap) +
    sessionStatus +
    " ".repeat(rightGap) +
    projectStatus
  );
}

async function renderLine2(status: Status): Promise<string> {
  const branch = await currentBranchName();
  const branchStatus = match(branch)
    .with({ status: "none" }, () => {
      return `💾`;
    })
    .with({ status: "branch" }, ({ name }) => {
      return `🌿 ${name}`;
    })
    .with({ status: "detached" }, ({ commit }) => {
      return `🪾 ${commit}`;
    })
    .with({ status: "error" }, () => {
      return `💥`;
    })
    .exhaustive();

  const usedPercentage = status.context_window.used_percentage ?? 0;
  const usageStatus = usedPercentage === 0 ? "" : `${usedPercentage}%`;

  const statusWidth = terminalSize().columns - HORIZONTAL_PADDING;
  const branchWidth = getDisplayWidth(branchStatus);
  const usageWidth = getDisplayWidth(usageStatus);

  const gap = statusWidth - branchWidth - usageWidth;

  return (
    branchStatus + " ".repeat(gap - 1) + colorizeUsageStatus(usedPercentage)
  );
}

async function renderTheme(status: Status): Promise<string> {
  const line1 = await renderLine1(status);
  const line2 = await renderLine2(status);
  return [line1, line2].filter(Boolean).join("\n");
}

async function defaultTheme(input?: string): Promise<string> {
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

export { defaultTheme };
