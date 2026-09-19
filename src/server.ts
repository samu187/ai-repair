#!/usr/bin/env node

import { createServer } from "node:http";
import { runAgent } from "./agent.js";
import { chooseTargetDir } from "./config.js";
import { setTargetDir } from "./tools/paths.js";

if (!process.env.OPENAI_API_KEY?.trim()) {
  throw new Error("Set OPENAI_API_KEY before starting AI Repair.");
}

const DEFAULT_PORT = 4545;
const DEFAULT_HOST = "127.0.0.1";

const port = Number(process.env.PORT || DEFAULT_PORT);
const host = process.env.HOST || DEFAULT_HOST;

const targetDir = await chooseTargetDir();
setTargetDir(targetDir);
console.log(`Agent target application: ${targetDir}`);

type AgentReport = Awaited<ReturnType<typeof runAgent>>["report"];

function formatAgentReport(report: AgentReport): string {
  const filesChanged = report.filesChanged.length > 0
    ? report.filesChanged.join(", ")
    : "none";
  const gitDiff = report.gitDiff ?? report.gitDiffError ?? "No git diff.";

  return [
    "",
    "Agent report",
    `status : ${report.status}`,
    `summary : ${formatSingleLine(report.summary)}`,
    `files changed -> ${filesChanged}`,
    "git diff :",
    gitDiff.trimEnd()
  ].join("\n");
}

function formatSingleLine(value: string): string {
  return value.trim().replace(/\s+/g, " ") || "none";
}

let repairInProgress = false;

const server = createServer(async (request, response) => {
  if (request.method !== "POST") {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Expected POST request." }));
    console.log("Error: Expected POST request");
    return;
  }

  let rawBody = "";
  for await (const chunk of request) {
    rawBody += chunk;
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Invalid JSON." }));
    console.log("Error: Invalid JSON");
    return;
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("error_log" in body) ||
    typeof body.error_log !== "string" ||
    body.error_log.trim() === ""
  ) {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Missing error_log field." }));
    console.log("Error: Missing error_log field");
    return;
  }

  if (repairInProgress) {
    response.writeHead(409, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "A repair is already in progress." }));
    return;
  }

  repairInProgress = true;
  const errorLog = body.error_log;
  console.log(`\n-> Received error log: ${errorLog}\n\n\-> Starting repair agent.\n`);

  runAgent(errorLog)
    .then((result) => {
      console.log(formatAgentReport(result.report));
    })
    .catch((error) => {
      console.error("Agent failed:", error);
    })
    .finally(() => {
      repairInProgress = false;
    });

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ ok: true }));
});

server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
