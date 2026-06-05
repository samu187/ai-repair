import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tool } from "@openai/agents";
import { z } from "zod";
import type { AgentState } from "../agent.js";
import { getTargetDir } from "./paths.js";

const execFileAsync = promisify(execFile);

const searchFilesSchema = z.object({
  query: z.string().min(1)
});

export const searchFilesTool = tool<typeof searchFilesSchema, AgentState>({
  name: "search_files",
  description: "Search the local project for text related to the error log.",
  parameters: searchFilesSchema,
  execute: async ({ query }, context) => {
    context?.context.searches.push(query);

    try {
      const { stdout } = await execFileAsync(
        "rg",
        ["--line-number", "--glob", "!node_modules", "--glob", "!dist", query, "."],
        {
          cwd: getTargetDir(),
          maxBuffer: 200_000
        }
      );

      return stdout.slice(0, 8000) || "No matches found.";
    } catch (error) {
      if (isExecError(error) && error.code === 1) {
        return "No matches found.";
      }

      return error instanceof Error ? error.message : "Search failed.";
    }
  }
});

function isExecError(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error;
}
