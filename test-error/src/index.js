import { simulateButtonPress } from "./app.js";

const AGENT_SERVER_URL = "http://127.0.0.1:4545";

try {
  console.log("User pressed the welcome button.");
  console.log(simulateButtonPress());
} catch (error) {
  const errorLog = formatErrorLog(error);
  console.error(errorLog);
  await sendErrorLog(errorLog);
}

function formatErrorLog(error) {
  if (error instanceof Error) {
    return [
      "Bug report: welcome button crashes when the current user has no profile.",
      "",
      error.stack ?? error.message
    ].join("\n");
  }

  return String(error);
}

async function sendErrorLog(errorLog) {
  try {
    const response = await fetch(AGENT_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error_log: errorLog
      })
    });

    console.log(`Sent error_log to AI Repair. Status: ${response.status}`);
  } catch (sendError) {
    console.error("Could not send error_log to AI Repair:", sendError);
  }
}
