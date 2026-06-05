import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tool } from "@openai/agents";
import { z } from "zod";
import type { AgentState } from "../agent.js";
import { getTargetDir } from "./paths.js";

const execFileAsync = promisify(execFile);
const gitDiffSchema = z.object({});

export const gitDiffTool = tool<typeof gitDiffSchema, AgentState>({
  name: "git_diff",
  description: "Collect the local git diff after making changes.",
  parameters: gitDiffSchema,
  execute: async (_input, context) => {
    if (!context) {
      return "Missing run context.";
    }

    return collectGitDiff(context.context);
  }
});

export async function collectGitDiff(state: AgentState): Promise<string> {
  state.gitDiffStatus = "not_run";
  state.gitDiffError = null;

  try {
    const { stdout } = await execFileAsync("git", ["diff"], {
      cwd: getTargetDir(),
      maxBuffer: 500_000
    });

    state.gitDiffStatus = "passed";
    state.gitDiff = stdout;
    return stdout.slice(0, 20_000) || "No git diff.";
  } catch (error) {
    const message = error instanceof Error ? error.message : "git diff failed.";
    state.gitDiffStatus = "failed";
    state.gitDiff = null;
    state.gitDiffError = message;
    return message;
  }
}
