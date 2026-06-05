import { readFile } from "node:fs/promises";
import { tool } from "@openai/agents";
import { z } from "zod";
import type { AgentState } from "../agent.js";
import { getSafeProjectPath } from "./paths.js";

const readFileSchema = z.object({
  path: z.string().min(1)
});

export const readFileTool = tool<typeof readFileSchema, AgentState>({
  name: "read_file",
  description: "Read one source file from the local project.",
  parameters: readFileSchema,
  execute: async (input, context) => {
    const safePath = getSafeProjectPath(input.path);
    context?.context.filesRead.push(input.path);

    try {
      const content = await readFile(safePath, "utf8");
      return content.slice(0, 20_000);
    } catch (error) {
      return error instanceof Error ? error.message : "Read failed.";
    }
  }
});
