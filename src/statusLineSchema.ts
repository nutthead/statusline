import { z } from "zod";

const statusSchema = z.object({
	session_id: z.string(),
	transcript_path: z.string(),
	cwd: z.string(),
	model: z.object({
		id: z.string(),
		display_name: z.string(),
	}),
	workspace: z.object({
		current_dir: z.string(),
		project_dir: z.string(),
	}),
	version: z.string(),
	output_style: z.object({
		name: z.string(),
	}),
	context_window: z.object({
		total_input_tokens: z.number(),
		total_output_tokens: z.number(),
		context_window_size: z.number(),
		current_usage: z
			.object({
				input_tokens: z.number(),
				output_tokens: z.number(),
				cache_creation_input_tokens: z.number(),
				cache_read_input_tokens: z.number(),
			})
			.nullable(),
		used_percentage: z.number().nullable(),
		remaining_percentage: z.number().nullable(),
		vim: z.object({
			mode: z.enum(["INSERT", "NORMAL"]),
		}),
		agent: z.object({
			name: z.string(),
			type: z.string(),
		}),
	}),
});

type Status = z.infer<typeof statusSchema>;

export { statusSchema, type Status };
