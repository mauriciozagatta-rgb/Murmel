"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

function sess(id,type,cycleAt,cycleCompleted,entries){
  return { id, type, variant:"main", date:"2026-08-0"+(id.length), entries:entries||[], deviation:false, cycleAt, cycleCompleted };
}

const app = loadApp();
const seed = app.get("SEED");

// weekly XP bonus follows cycleCompleted, not a weekly session count
app.setS({ ...JSON.parse(JSON.stringify(seed)), gami:{}, cycle:{position:0,completedCycles:1,variant:"A"},
  sessions:[ sess("s1","push",0,false), sess("s2","pull",0,false), sess("s3","legs",0,true) ] });
const g = app.call("computeGami");
const bdWeekly = g.per.map(p=>p.bd.weekly);
assert.deepEqual([...bdWeekly].sort(), [0,0,50], "exactly the cycle-completing session earns the weekly bonus");

// weeklyChallenge windows by completed-cycle count, not isoWeek
app.setS({ ...JSON.parse(JSON.stringify(seed)), gami:{...seed.gami, weekChallenge:null}, cycle:{position:0,completedCycles:2,variant:"A"}, sessions:[] });
const wc = app.call("weeklyChallenge", {});
assert.equal(wc.weekKey, 2);

// deload trigger: 3 stalled exercises in one plan day
app.setS(JSON.parse(JSON.stringify(seed)));
app.S().gami = {};
app.S().cycle = { position:0, completedCycles:1, variant:"A" };
app.S().sessions = [];
const planDay = app.S().plan.push_main.slice(0,3);
let d = "2026-06-01";
// session 0 sets the e1RM peak (higher reps); sessions 1-4 sit below it at a flat
// value, so plateauInfo()'s backward scan counts exactly 4 sessions with no new peak.
for (let i=0;i<5;i++){
  const reps = i===0 ? 14 : 10;
  app.S().sessions.push({ id:"h"+i, type:"push", variant:"main", date:d, cycleAt:0, cycleCompleted:false,
    entries: planDay.map(exId=>({ exerciseId:exId, sets:[{kg:20,reps}] })) });
  d = app.call("addDays", d, 7);
}
app.call("checkCycleDeloadTrigger");
assert.equal(app.S().gami.deloadActive, true, "3 exercises with 4+ sessions of no e1RM progress in one plan day must trigger deload");

app.call("dismissDeload");
assert.equal(app.S().gami.deloadActive, false);
app.call("checkCycleDeloadTrigger");
assert.equal(app.S().gami.deloadActive, false, "must not immediately re-trigger within the same completed-cycle count after dismissal");

console.log("OK");
