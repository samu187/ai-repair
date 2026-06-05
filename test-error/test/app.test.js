import assert from "node:assert/strict";
import test from "node:test";
import { getWelcomeMessage } from "../src/app.js";

test("welcome message handles a user without a profile", () => {
  const user = {
    id: "user_123",
    email: "sam@example.com"
  };

  assert.equal(getWelcomeMessage(user), "Welcome back, sam@example.com!");
});
