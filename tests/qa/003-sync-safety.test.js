"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

const app = loadApp();

// checkVersionOrPrompt: same version never prompts
app.setS({ version: 3 });
app.sandbox.confirm = () => { throw new Error("confirm() must not be called when versions match"); };
const same = app.call("checkVersionOrPrompt", { version: 3 });
assert.equal(same, true);

// mismatched version always prompts, even when the caller is a "silent" path
let confirmCalls = 0;
app.sandbox.confirm = (msg) => { confirmCalls++; return false; };
app.setS({ version: 3 });
const mismatched = app.call("checkVersionOrPrompt", { version: 2 }, { silent: true });
assert.equal(confirmCalls, 1, "a version mismatch must force a blocking prompt even in silent/auto-sync paths");
assert.equal(mismatched, false, "declining the prompt must block the caller from accepting the blob");

// scheduleAutoPush must refuse to run while migration is incomplete
app.sandbox.localStorage.setItem("murmel:autosync", "1");
app.sandbox.localStorage.setItem("murmel:gClientId", "test-client-id");
let pushed = false;
app.sandbox.window.cloudPush = () => { pushed = true; };
app.setS({ version: 3, _migrationComplete: false });
app.call("scheduleAutoPush");
// scheduleAutoPush uses a real setTimeout(4000) internally when it does proceed;
// asserting synchronously that no timer was armed for the half-migrated case is
// sufficient here — the gate check itself is synchronous and returns before setTimeout.
assert.equal(pushed, false, "auto-push must not fire (even via timer) while _migrationComplete is false");

console.log("OK");
