import { Agent, run } from "@openai/agents";
import { editFileTool } from "./tools/editFile.js";
import { collectGitDiff, gitDiffTool } from "./tools/gitDiff.js";
import { readFileTool } from "./tools/readFile.js";
import { searchFilesTool } from "./tools/searchFiles.js";
import { runStandardTests, testTool, type TestResult } from "./tools/test.js";

export type AgentState = {
  errorLog: string;
  status: "started" | "ready_for_review" | "needs_attention" | "failed";
  finalOutput: string | null;
  searches: string[];
  filesRead: string[];
  filesChanged: string[];
  commandsRun: string[];
  testsStatus: "not_run" | "running" | "failed" | "passed";
  testResults: TestResult[];
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
  testsStatus: AgentState["testsStatus"];
  testResults: TestResult[];
  gitDiffStatus: AgentState["gitDiffStatus"];
  gitDiff: string | null;
  gitDiffError: string | null;
  readyForHumanReview: boolean;
};

// Agent setup
const repairAgent = new Agent({
  name: "Repair Agent",
  model: "gpt-5.4-mini",
  instructions: `
You are a focused local repair agent.
You are not a general chat assistant.

Use search_files and read_file to inspect the local project.
Use edit_file only after reading the target file.
When using edit_file, oldText must be an exact unique block from the file.
Use test to verify changes.
Use git_diff after making changes.
Return a concise summary of:
1. what the error seems to be
2. which files you inspected
3. what you changed, if anything
4. what the test tool returned
5. whether the issue is ready for human review

Do not claim the bug is fixed unless tests passed.
Never say production can be deployed.
If you change files, you must call test and git_diff before finishing.
`,
  tools: [searchFilesTool, readFileTool, editFileTool, testTool, gitDiffTool]
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
    commandsRun: [],
    testsStatus: "not_run",
    testResults: [],
    gitDiffStatus: "not_run",
    gitDiff: null,
    gitDiffError: null
  };

  try {
    const result = await run(
      repairAgent,
      `Error log received:\n\n${errorLog}`,
      {
        context: state,
        maxTurns: 12
      }
    );

    state.finalOutput = String(result.finalOutput ?? "");

    if (state.filesChanged.length > 0 && state.testsStatus === "not_run") {
      await runStandardTests(state);
    }

    if (state.filesChanged.length > 0 && state.gitDiff === null) {
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
    state.testsStatus === "passed" &&
    state.gitDiffStatus === "passed"
  );
}

function buildReport(state: AgentState): AgentReport {
  return {
    status: state.status,
    summary: state.finalOutput ?? "",
    filesRead: state.filesRead,
    filesChanged: state.filesChanged,
    testsStatus: state.testsStatus,
    testResults: state.testResults,
    gitDiffStatus: state.gitDiffStatus,
    gitDiff: state.gitDiff,
    gitDiffError: state.gitDiffError,
    readyForHumanReview: state.status === "ready_for_review"
  };
}
