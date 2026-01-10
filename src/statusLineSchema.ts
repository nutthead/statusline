import { z } from "zod";

export const statusSchema = z.object({
  hook_event_name: z.string().optional(),
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
  output_style: z
    .object({
      name: z.string(),
    })
    .optional(),
  cost: z.object({
    total_cost_usd: z.number(),
    total_duration_ms: z.number(),
    total_api_duration_ms: z.number(),
    total_lines_added: z.number(),
    total_lines_removed: z.number(),
  }),
  context_window: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      cache_creation_input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
    })
    .nullable(),
});

export type Status = z.infer<typeof statusSchema>;
