"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

const app = loadApp();
const seed = app.get("SEED");

app.setS({ ...JSON.parse(JSON.stringify(seed)), gami:{}, cycle:{position:0,completedCycles:0,variant:"A"}, sessions:[] });

// no cardio history yet -> starts with A
assert.equal(app.call("nextCardioType"), "A");

// first A session: default starting values
let sg = app.call("suggestCardio", "A");
assert.equal(sg.incline, 5); assert.equal(sg.speed, 4.5); assert.equal(sg.duration, 25);

const id1 = app.call("logCardioSession", "A", 5, 4.5, 25, 3);
assert.ok(app.S().sessions.find(s=>s.id===id1));
assert.equal(app.S().cycle.completedCycles, 0, "logging cardio must never touch S.cycle");

// next due type alternates to B
assert.equal(app.call("nextCardioType"), "B");

// RPE 3 (below the 4-5 trigger band) -> hold, no change
sg = app.call("suggestCardio", "A");
assert.equal(sg.incline, 5); assert.equal(sg.duration, 25);

// log a 2nd A session at RPE 4 -> triggers a bump; even count-so-far (0) at bump time -> incline
const id2 = app.call("logCardioSession", "A", 5, 4.5, 25, 4);
sg = app.call("suggestCardio", "A");
assert.equal(sg.incline, 5.5, "RPE 4-5 on an even-indexed session bumps incline, not duration");
assert.equal(sg.duration, 25, "duration must not also move — 'not both'");

// log a 3rd A session at RPE 5 -> odd count-so-far (2) at bump time -> duration this time
app.call("logCardioSession", "A", 5.5, 4.5, 25, 5);
sg = app.call("suggestCardio", "A");
assert.equal(sg.duration, 27, "the alternate trigger bumps duration by 2min");
assert.equal(sg.incline, 5.5, "incline must not also move this time");

// incline cap: 2 prior B sessions -> countSoFar=2 (even) would normally prefer bumping
// incline, but it's already at the 10% cap, so this must fall back to duration instead.
app.setS({ ...JSON.parse(JSON.stringify(seed)), gami:{}, cycle:{position:0,completedCycles:0,variant:"A"}, sessions:[
  { id:"c0", type:"cardio", cardioType:"B", date:"2026-06-24", entries:[], durationMin:28, incline:9.5, speed:4, rpe:3, deviation:false, cycleAt:0, cycleCompleted:false },
  { id:"c1", type:"cardio", cardioType:"B", date:"2026-07-01", entries:[], durationMin:28, incline:10,  speed:4, rpe:4, deviation:false, cycleAt:0, cycleCompleted:false },
] });
sg = app.call("suggestCardio", "B");
assert.equal(sg.incline, 10, "incline must never exceed the 10% cap");
assert.equal(sg.duration, 30, "even though parity would normally prefer incline (2 prior sessions), the cap forces the fallback to duration");

// weekly soft indicator
app.setS({ ...JSON.parse(JSON.stringify(seed)), gami:{}, cycle:{position:0,completedCycles:0,variant:"A"}, sessions:[] });
const today = app.call("todayStr");
app.call("logCardioSession", "A", 5, 4.5, 25, 3);
assert.equal(app.call("cardioWeeklyCount"), 1);
assert.equal(app.call("cardioXp"), 10);

// cardio must never leak into strength XP/quests — "own XP/quest track, separate from strength"
app.setS({ ...JSON.parse(JSON.stringify(seed)), gami:{}, cycle:{position:0,completedCycles:0,variant:"A"}, sessions:[
  { id:"p1", type:"push", variant:"main", date:"2026-07-01", cycleAt:0, cycleCompleted:false,
    entries:[{ exerciseId:"db_flachbank", sets:[{kg:20,reps:10,done:true},{kg:20,reps:10,done:true},{kg:20,reps:10,done:true}] }] },
] });
app.call("logCardioSession", "A", 5, 4.5, 25, 3);
app.call("logCardioSession", "B", 8, 4, 25, 3);
const gWithCardio = app.call("computeGami");
assert.equal(gWithCardio.per.length, 1, "computeGami() must count only the 1 strength session, not the 2 cardio ones");
assert.equal(gWithCardio.per[0].type, "push");
const xpBonus = app.call("sessionXpBonus");
assert.equal(xpBonus, 15, "sessionXpBonus() must count only the 3 completed strength sets (+5 each), ignoring the 2 cardio sessions entirely");

console.log("OK");
