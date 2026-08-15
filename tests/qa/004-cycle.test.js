"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

const app = loadApp();
app.setS({
  version: 3,
  settings: { cycleLength: 4 },
  cycle: { position: 0, completedCycles: 0, variant: "A" },
  sessions: [],
});

// 4-day sequence, cycle A: push -> pull -> legs -> push(bonus) -> [flip to B]
let due = app.call("cycleNextDue");
assert.deepEqual({...due}, { type: "push", variant: "main" });

let r = app.call("cycleAdvance", "push", "main");
assert.equal(r.deviation, false);
assert.equal(r.cycleAt, 0);

due = app.call("cycleNextDue");
assert.deepEqual({...due}, { type: "pull", variant: "main" });
app.call("cycleAdvance", "pull", "main");

due = app.call("cycleNextDue");
assert.deepEqual({...due}, { type: "legs", variant: "main" });
app.call("cycleAdvance", "legs", "main");

due = app.call("cycleNextDue");
assert.deepEqual({...due}, { type: "push", variant: "bonus" }, "cycle A's bonus day is push");
r = app.call("cycleAdvance", "push", "bonus");
assert.equal(r.deviation, false);

const S1 = app.S();
assert.equal(S1.cycle.completedCycles, 1, "completing the 4th slot must complete the cycle");
assert.equal(S1.cycle.position, 0, "position resets after a completed cycle");
assert.equal(S1.cycle.variant, "B", "bonus variant flips to B after cycle A completes");

due = app.call("cycleNextDue");
assert.deepEqual({...due}, { type: "push", variant: "main" }, "cycle B still opens with push main");

// out-of-order logging: pointer advances to the position AFTER whatever was actually logged, flagged, no penalty
r = app.call("cycleAdvance", "legs", "main");
assert.equal(r.deviation, true, "logging legs when push was due must be flagged as a deviation");
due = app.call("cycleNextDue");
assert.deepEqual({...due}, { type: "pull", variant: "bonus" }, "pointer must land AFTER the out-of-order entry, not repeat it");

// 3-day sequence never offers a bonus slot
app.setS({ version: 3, settings: { cycleLength: 3 }, cycle: { position: 0, completedCycles: 0, variant: "A" }, sessions: [] });
const seq3 = app.call("cycleDaySequence");
assert.equal(seq3.length, 3);
assert.ok(seq3.every(d => d.variant === "main"));

// dueType() keeps its old contract
app.setS({ version: 3, settings: { cycleLength: 4 }, cycle: { position: 0, completedCycles: 0, variant: "A" }, sessions: [] });
assert.equal(app.call("dueType"), "push");

// migration backfill: 5 historical push/pull/legs sessions, no bonus concept, must not be flagged as deviated
const fixture = {
  version: 2,
  settings: { restSeconds: 90, weeklyGoal: 4 },
  bodyweight: { goalKg: 85, log: [], metrics: [] },
  plan: { push: [], pull: [], legs: [] },
  exercises: {},
  sessions: [
    { id: "s1", type: "push", date: "2026-07-01", entries: [] },
    { id: "s2", type: "pull", date: "2026-07-02", entries: [] },
    { id: "s3", type: "legs", date: "2026-07-03", entries: [] },
    { id: "s4", type: "push", date: "2026-07-04", entries: [] },
    { id: "s5", type: "pull", date: "2026-07-05", entries: [] },
  ],
  draft: null,
};
const { state } = app.call("migrate", fixture);
assert.ok(state.cycle, "migration must initialize S.cycle");
assert.equal(state.sessions.every(s => s.deviation === false), true, "backfilled history must never be flagged as deviated");
assert.ok(state.sessions.every(s => s.variant === "main"), "backfilled history has no bonus concept, all main");
assert.equal(state.sessions[0].cycleAt, 0);
assert.equal(state.sessions[2].cycleAt, 0, "3rd session (legs) completes cycle 0, so it's still tagged cycleAt:0");
assert.equal(state.sessions[3].cycleAt, 1, "4th session starts cycle 1");
assert.equal(state.cycle.completedCycles, 1, "5 sessions through a 3-slot sequence = 1 completed cycle, mid-way through the 2nd");
assert.equal(state.cycle.position, 2, "2 sessions into cycle 1 (push, pull done) -> position 2 (legs next)");

console.log("OK");
