import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tool } from "@openai/agents";
import { z } from "zod";
import type { AgentState } from "../agent.js";
import { getTargetDir } from "./paths.js";

const execFileAsync = promisify(execFile);
const testSchema = z.object({});
const testCommands = ["npm run typecheck", "npm run build", "npm test"] as const;

export type TestResult = {
  command: string;
  passed: boolean;
  output: string;
};

export const testTool = tool<typeof testSchema, AgentState>({
  name: "test",
  description: "Run the standard verification sequence for the target application.",
  parameters: testSchema,
  execute: async (_input, context) => {
    if (!context) {
      return "Missing run context.";
    }

    return runStandardTests(context.context);
  }
});

export async function runStandardTests(state: AgentState): Promise<TestResult[]> {
  state.testsStatus = "running";

  const results: TestResult[] = [];

  for (const command of testCommands) {
    state.commandsRun.push(command);
    const [program, ...args] = command.split(" ");

    try {
      const { stdout, stderr } = await execFileAsync(program, args, {
        cwd: getTargetDir(),
        maxBuffer: 300_000
      });

      results.push({
        command,
        passed: true,
        output: [stdout, stderr].filter(Boolean).join("\n").slice(0, 8000)
      });
    } catch (error) {
      state.testsStatus = "failed";
      const failedResults = [
        ...state.testResults,
        ...results,
        {
          command,
          passed: false,
          output: getCommandOutput(error)
        }
      ];
      state.testResults = failedResults;
      return results.concat(failedResults.at(-1)!);
    }
  }

  state.testsStatus = "passed";
  state.testResults = [...state.testResults, ...results];
  return results;
}

function getCommandOutput(error: unknown): string {
  if (isExecError(error)) {
    return [error.stdout, error.stderr].filter(Boolean).join("\n").slice(0, 8000);
  }

  return error instanceof Error ? error.message : "Test command failed.";
}

function isExecError(error: unknown): error is { stdout?: string; stderr?: string } {
  return typeof error === "object" && error !== null;
}
