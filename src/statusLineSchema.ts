import { z } from "zod";

export const statusSchema = z.object({
  hook_event_name: z.string(),
  session_id: z.string(),
  transcript_path: z.string(),
  cwd: z.string(),
  model: z.object({
    id: z.string(),
    display_name: z.string(),
  }).partial(),
  workspace: z.object({
    current_dir: z.string(),
    project_dir: z.string(),
  }).partial(),
  version: z.string(),
  output_style: z.object({
    name: z.string(),
  }).partial(),
  cost: z.object({
    total_cost_usd: z.number(),
    total_duration_ms: z.number(),
    total_api_duration_ms: z.number(),
    total_lines_added: z.number(),
    total_lines_removed: z.number(),
  }).partial(),
  context_window: z.object({
    total_input_tokens: z.number(),
    total_output_tokens: z.number(),
    context_window_size: z.number(),
    current_usage: z.object({
      input_tokens: z.number(),
      output_tokens: z.number(),
      cache_creation_input_tokens: z.number(),
      cache_read_input_tokens: z.number(),
    }).partial(),
  }).partial(),
}).partial();

export type Status = z.infer<typeof statusSchema>;
