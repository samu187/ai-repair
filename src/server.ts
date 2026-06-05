#!/usr/bin/env node

import { createServer } from "node:http";
import { runAgent } from "./agent.js";
import { chooseTargetDir } from "./config.js";
import { setTargetDir } from "./tools/paths.js";


const DEFAULT_PORT = 4545;
const DEFAULT_HOST = "127.0.0.1";

const port = Number(process.env.PORT || DEFAULT_PORT);
const host = process.env.HOST || DEFAULT_HOST;

const targetDir = await chooseTargetDir();
setTargetDir(targetDir);
console.log(`Agent target application: ${targetDir}`);


const server = createServer(async (request, response) => {
  if (request.method !== "POST") {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Expected POST request." }));
    console.log("Error: Expected POST request")
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
    console.log("Error: Invalid JSON")
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
    console.log("Error: Missing error_log field")
    return;
  }

  const errorLog = body.error_log;
  console.log(`\n-> Received error log: ${errorLog}\n\n\-> Calling the slave to fix it! :)\n\n`);

  
  // Run Agent
  runAgent(errorLog)
    .then((result) => {
      console.log("Agent report:", JSON.stringify(result.report, null, 2));
    })
    .catch((error) => {
      console.error("Agent failed:", error);
    });


  // Asks user to push to production



  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ ok: true }));
});


server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
