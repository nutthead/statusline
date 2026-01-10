import { statusSchema, type Status } from "./src/statusLineSchema";

const input = await Bun.stdin.text();
const json = JSON.parse(input);

const result = statusSchema.safeParse(json);
if (!result.success) {
  console.error("Invalid status data: ", result.error);
  process.exit(1);
}

const status: Status = result.data;
const model = status.model?.display_name ?? "Unknown Model";

const usage = status.context_window?.current_usage;
const inputTokens =
  (usage?.input_tokens ?? 0) +
  (usage?.cache_read_input_tokens ?? 0) +
  (usage?.cache_creation_input_tokens ?? 0);

const contextSize = status.context_window?.context_window_size ?? "?";

const statusLine = `${model} : ${inputTokens.toLocaleString()} / ${contextSize.toLocaleString()}`;

console.log(statusLine);
