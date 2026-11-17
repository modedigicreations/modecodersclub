import type { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { COURSE_GENERATE_MODEL, getAnthropic } from "@/lib/anthropic";

/** One structured call: system + user prompt in, data matching `schema` out. */
export type StructuredCall = <S extends z.ZodType>(req: {
  schema: S;
  system: string;
  prompt: string;
  maxTokens: number;
}) => Promise<{ data: z.infer<S>; inputTokens: number; outputTokens: number; model: string }>;

export class GenerationError extends Error {}

/**
 * Claude via the Messages API with structured outputs. If Claude's safety
 * checks decline a request, the server-side fallback beta retries it on
 * another model automatically ("default" routing), so a false positive
 * doesn't fail the whole course.
 */
export const claudeStructuredCall: StructuredCall = async ({ schema, system, prompt, maxTokens }) => {
  const response = await getAnthropic().beta.messages.parse({
    model: COURSE_GENERATE_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (response.stop_reason === "refusal") {
    throw new GenerationError("Claude declined to write this part of the course. Try rewording the topic.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new GenerationError("The answer was cut off (too long).");
  }
  const data = response.parsed_output;
  if (data == null) throw new GenerationError("Claude's answer didn't match the expected format.");
  return {
    data: data as z.infer<typeof schema>,
    inputTokens: response.usage.input_tokens ?? 0,
    outputTokens: response.usage.output_tokens ?? 0,
    model: response.model,
  };
};
