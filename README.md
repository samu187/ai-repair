# AI Repair

Simple TypeScript server that receives an error log from your app.

The server accepts a JSON `error_log` field, sends it to a local repair agent, and keeps production deployment as a human decision.

When the server starts, it asks where your application directory is. The agent uses that directory for reading files, writing files, running tests, and collecting git diff.

## Agent Flow

```txt
POST error_log
  -> agent inspects target app
  -> agent edits exact text blocks only
  -> agent runs test
  -> agent collects git diff
  -> server prints report for human review
```

The agent cannot push or deploy.

## Request

Send a `POST` request to:

```txt
http://localhost:4545
```

With JSON like:

```json
{
  "error_log": "TypeError: Cannot read properties of undefined"
}
```

If the request is not `POST`, has invalid JSON, or does not include `error_log`, the server returns an error response.

## Scripts

Install dependencies:

```sh
npm install
```

Set your OpenAI API key:

```sh
export OPENAI_API_KEY="your_api_key_here"
```

Run in development:

```sh
npm run dev
```

By default, the server listens on `127.0.0.1:4545`. You can change this with `HOST` and `PORT`.

Build:

```sh
npm run build
```

Run compiled server:

```sh
npm start
```

Run as a local command after building:

```sh
npm link
ai-repair
```

## Test With Curl

```sh
curl -X POST http://localhost:4545 \
  -H "Content-Type: application/json" \
  -d '{"error_log":"Example error stack"}'
```

Expected response:

```json
{
  "ok": true
}
```
