import { Agent, OpenAIProvider, Runner } from "@openai/agents";
import { writeFile } from "node:fs/promises";
import { editFileTool } from "./tools/editFile.js";
import { collectGitDiff, gitDiffTool } from "./tools/gitDiff.js";
import { readFileTool } from "./tools/readFile.js";
import { searchFilesTool } from "./tools/searchFiles.js";

export type AgentState = {
  errorLog: string;
  status: "started" | "ready_for_review" | "needs_attention" | "failed";
  finalOutput: string | null;
  searches: string[];
  filesRead: string[];
  filesChanged: string[];
  gitDiffStatus: "not_run" | "failed" | "passed";
  gitDiff: string | null;
  gitDiffError: string | null;
};

type AgentResult = {
  state: AgentState;
  report: AgentReport;
};

type AgentReport = {
  status: AgentState["status"];
  summary: string;
  filesRead: string[];
  filesChanged: string[];
  gitDiffStatus: AgentState["gitDiffStatus"];
  gitDiff: string | null;
  gitDiffError: string | null;
  readyForHumanReview: boolean;
};

const runner = new Runner({
  modelProvider: new OpenAIProvider({
    baseURL: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    useResponses: true
  }),
  tracingDisabled: true
});


const repairAgent = new Agent({
  name: "Repair Agent",
  model: "gpt-4.1",
  instructions: `
You are a focused local repair agent.
You are not a general chat assistant.

Use search_files and read_file to inspect the local project.
Use edit_file only after reading the target file.
When using edit_file, oldText must be an exact unique block from the file.
Use git_diff after making changes.
If you change files, call git_diff before finishing.
Return a short concise summary of:
1. what the error seems to be
2. what you changed, if anything
3. What the user should check next.
Changes are unverified proposals. Do not claim the bug is fixed.
`,
  tools: [searchFilesTool, readFileTool, editFileTool, gitDiffTool]
});

// Main agent run
export async function runAgent(errorLog: string): Promise<AgentResult> {
  // State
  const state: AgentState = {
    errorLog,
    status: "started",
    finalOutput: null,
    searches: [],
    filesRead: [],
    filesChanged: [],
    gitDiffStatus: "not_run",
    gitDiff: null,
    gitDiffError: null
  };

  try {
    const result = await runner.run(
      repairAgent,
      `Error log received:\n\n${errorLog}`,
      {
        context: state,
        maxTurns: 12
      }
    );

    state.finalOutput = String(result.finalOutput ?? "");
    await writeFile(
      "agent-result.json",
      JSON.stringify(result, null, 2)
    );

    if (state.filesChanged.length > 0) {
      await collectGitDiff(state);
    }

    state.status = isReadyForReview(state) ? "ready_for_review" : "needs_attention";

    return {
      state,
      report: buildReport(state)
    };
  } catch (error) {
    state.status = "failed";
    state.finalOutput = error instanceof Error ? error.message : "Unknown agent error.";

    return {
      state,
      report: buildReport(state)
    };
  }
}

function isReadyForReview(state: AgentState): boolean {
  return (
    state.filesChanged.length > 0 &&
    state.gitDiffStatus === "passed"
  );
}

function buildReport(state: AgentState): AgentReport {
  return {
    status: state.status,
    summary: state.finalOutput ?? "",
    filesRead: state.filesRead,
    filesChanged: state.filesChanged,
    gitDiffStatus: state.gitDiffStatus,
    gitDiff: state.gitDiff,
    gitDiffError: state.gitDiffError,
    readyForHumanReview: state.status === "ready_for_review"
  };
}
