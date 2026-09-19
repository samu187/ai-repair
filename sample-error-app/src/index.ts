import { runApp } from "./app.js";

const repairUrl = `http://127.0.0.1:${process.env.PORT || "4545"}`;

try {
  await runApp();
} catch (error) {
  process.exitCode = 1;
  const errorLog = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`\nSample app failed:\n${errorLog}`);

  try {
    const response = await fetch(repairUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error_log: errorLog }),
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      throw new Error(`AI Repair returned HTTP ${response.status}: ${await response.text()}`);
    }

    console.log("\nError sent to AI Repair. Watch its terminal for the proposed fix.");
    console.log("Review the diff, then run npm run demo again.");
  } catch (reportError) {
    console.error(`\nCould not send the error to ${repairUrl}. Is AI Repair running?`);
    console.error(reportError instanceof Error ? reportError.message : String(reportError));
  }
}
