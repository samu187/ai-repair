# Test Error App

Small app used to test the repair agent.

Run the app:

```sh
npm start
```

It intentionally crashes, catches the error, and sends this JSON to AI Repair on `localhost:4545`:

```json
{
  "error_log": "..."
}
```

The regression test currently fails:

```sh
npm test
```

The agent should inspect the error, edit `src/app.js`, run tests, and report the diff.
