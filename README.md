# AI Repair

**Send an error log. Get a proposed code fix.**

A small experiment in using an AI agent to handle the first pass of debugging. It searches your project, reads the relevant files, makes targeted edits, and prints a summary with a Git diff for you to review.

- Accepts error logs through a simple HTTP endpoint.
- Uses OpenAI to investigate the code and suggest a repair by editing local files.
- Replaces exact text blocks to keep edits focused.
- Handles one repair at a time and leaves review, verification, and deployment to you.

Built for local use with trusted repositories. Changes are applied directly to your working copy and aren't automatically tested. Error logs and code read by the agent are sent to OpenAI.

## Tech stack

- **TypeScript + Node.js** — server and file tools
- **OpenAI Agents SDK + GPT-4.1** — agent loop and tool calling
- **Zod** — tool input validation
- **ripgrep + Git** — code search and change review

## Setup

You'll need Node.js 22+, Git, ripgrep (`rg`), and an OpenAI API key.

```sh
npm install
export OPENAI_API_KEY="your_api_key_here"
npm run dev
```

Choose your application's directory when prompted. Use a local Git checkout with a clean working tree so the diff is easy to review. The server listens at `http://127.0.0.1:4545` by default.

`npm run dev` runs without a file watcher so the interactive prompts work normally. Press Ctrl+C to stop it; restart it manually after changing the server code.

Send an error log from another terminal:

```sh
curl http://127.0.0.1:4545 \
  -H "Content-Type: application/json" \
  -d '{"error_log":"TypeError: Cannot read properties of undefined at src/app.ts:42"}'
```

The endpoint returns `{"ok":true}` when the repair starts. The summary and diff appear in the server terminal when it finishes.

For a compiled build, run `npm run build`, then `npm start`. Set `PORT` to change the listening port.

### Try the included demo

`sample-error-app` is a tiny TypeScript app that prints order summaries. One order has no customer, and the app crashes when it tries to read their name. Its entry point catches the error and sends the stack trace to AI Repair.

**Terminal 1 — start AI Repair** from the repository root:

```sh
export OPENAI_API_KEY="your_api_key_here"
npm run dev
```

If asked to reuse a saved directory, answer `n`. Choose **2. Another directory** and enter `./sample-error-app`. Wait for the server to start listening.

**Terminal 2 — run the sample**, also from the repository root:

```sh
npm run demo
```

It prints the first order, crashes on the guest order, and forwards the error to port `4545`. The sample exits with an error code because the app failed; the repair continues in Terminal 1. If you changed `PORT`, use the same value in both terminals.

Watch Terminal 1 as the agent investigates. When its report appears, review the changes in `sample-error-app/src/app.ts`, then run `npm run demo` again. A successful repair prints both orders, using `Guest` for the missing customer, followed by `All orders processed successfully.` The sample shares the root project's dependencies, so no second install is needed.

To repeat the demo, restore the deliberately broken line in `sample-error-app/src/app.ts`:

```ts
const customerName = order.customer!.name;
```

## Project structure

```text
src/
├── server.ts          # HTTP endpoint and terminal report
├── agent.ts           # OpenAI agent, instructions, and run state
├── config.ts          # Choose and remember the target directory
└── tools/
    ├── searchFiles.ts  # Search source code with ripgrep
    ├── readFile.ts     # Read a project file
    ├── editFile.ts     # Replace an exact text block
    ├── gitDiff.ts      # Collect changes for review
    └── paths.ts        # Keep file access inside the target directory
sample-error-app/
├── src/
│   ├── index.ts        # Catch errors and forward them to AI Repair
│   └── app.ts          # Order summaries with a deliberate runtime bug
└── tsconfig.json
```
