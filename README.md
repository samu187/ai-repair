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

Send an error log from another terminal:

```sh
curl http://127.0.0.1:4545 \
  -H "Content-Type: application/json" \
  -d '{"error_log":"TypeError: Cannot read properties of undefined at src/app.ts:42"}'
```

The endpoint returns `{"ok":true}` when the repair starts. The summary and diff appear in the server terminal when it finishes.

For a compiled build, run `npm run build`, then `npm start`. Set `PORT` to change the listening port.

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
```
