import { z } from "zod";
import { log } from "../logging";
import { statusSchema } from "../statusLineSchema";
import {
	workspaceStatus,
	currentGitStatus,
	currentModelStatus,
	currentSessionId,
} from "../utils";

import c from "ansi-colors";

async function defaultTheme(input?: string): Promise<string> {
	let statusLine = null;

	if (input) {
		const result = statusSchema.safeParse(input);

		if (result.success) {
			const status = result.data;
			const { projectDir, currentDir } = workspaceStatus(status);
			const dirStatus =
				projectDir === currentDir
					? c.blue(`🗂️ ${projectDir}`)
					: c.blue(`🗂️ ${projectDir} 📂 ${currentDir}`);
			const git = c.green(await currentGitStatus());
			const model = c.magenta(currentModelStatus(status));
			const sessionId = c.blue(currentSessionId(status, { decorate: true }));
			const separator = c.bold.gray(" ⋮ ");

			statusLine = [
				[dirStatus, git],
				[model, sessionId],
			]
				.map((row) => row.join(separator))
				.join("\n");
		} else {
			log.error("Failed to parse input: {error}", {
				error: JSON.stringify(z.treeifyError(result.error)),
			});
			statusLine = `[malformed status]`;
		}
	} else {
		statusLine = `[no status]`;
	}

	return statusLine;
}

export { defaultTheme };
