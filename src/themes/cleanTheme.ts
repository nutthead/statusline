import { z } from "zod";
import { match, P } from "ts-pattern";
import { log } from "../logging";
import { statusSchema, type Status } from "../statusLineSchema";
import {
	workspaceStatus,
	currentGitStatus,
	currentModelStatus,
	currentSessionId,
} from "../utils";

import c from "ansi-colors";

async function renderTheme(_input: Status): Promise<string> {
	// TODO: implement clean theme rendering
	return "";
}

async function cleanTheme(input?: string): Promise<string> {
	const result = input ? statusSchema.safeParse(input) : undefined;

	return match(result)
		.with({ success: true, data: P.select() }, (status) => renderTheme(status))
		.with({ success: false, error: P.select() }, (error) => {
			log.error("Failed to parse input: {error}", {
				error: JSON.stringify(error.issues),
			});

			return "";
		})
		.with(undefined, () => "")
		.exhaustive();
}

export { cleanTheme };
