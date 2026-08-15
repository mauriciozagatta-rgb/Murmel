"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

const app = loadApp();
const seed = app.get("SEED");

assert.deepEqual({...app.get("TYPES").cardio}, { label:"Cardio", color:"var(--cardio)", cls:"t-cardio" });

app.setS({ ...JSON.parse(JSON.stringify(seed)), gami:{}, cycle:{position:0,completedCycles:0,variant:"A"}, sessions:[], draft:null });

// home screen shows a cardio tile distinct from the PPL type cards, and doesn't
// try to route cardio through the generic PPL "start session" flow
const homeHtml = app.call("vHome");
assert.match(homeHtml, /Cardio/);
assert.match(homeHtml, /go\('cardioLog'\)/);
assert.doesNotMatch(homeHtml, /startSession\('cardio'/, "cardio must not go through the generic PPL startSession() card");

// vCardioLog initializes a draft from suggestCardio() and lets it be edited
app.call("go", "cardioLog");
let logHtml = app.call("vCardioLog");
assert.match(logHtml, /Cardio A/); // first-ever cardio session -> nextCardioType() is "A"
assert.equal(app.S()._cardioDraft.incline, 5);

app.call("stepCardio", "incline", 0.5);
assert.equal(app.S()._cardioDraft.incline, 5.5);
app.call("stepCardio", "rpe", 3); // from null -> clamped default 5, +3 -> 8... see stepCardio's null-start behavior
assert.equal(app.S()._cardioDraft.rpe, 8);

app.call("finishCardioLog");
assert.equal(app.S()._cardioDraft, null, "draft must be cleared after logging");
assert.equal(app.S().sessions.length, 1);
assert.equal(app.S().sessions[0].type, "cardio");
assert.equal(app.S().sessions[0].incline, 5.5);
assert.equal(app.S().sessions[0].rpe, 8);

// vHistory renders a cardio-specific row (not "0 Übungen")
const historyHtml = app.call("vHistory");
assert.match(historyHtml, /5\.5% · 4,5 km\/h · 25 min · RPE 8/);
assert.doesNotMatch(historyHtml, /0 Übungen/);

// vDetail dispatches cardio sessions to vCardioDetail
app.call("go", "sessionDetail", app.S().sessions[0].id);
const detailHtml = app.call("vDetail");
assert.match(detailHtml, /Steigung/);
assert.match(detailHtml, /RPE/);

console.log("OK");
