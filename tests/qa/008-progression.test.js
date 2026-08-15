"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

function withEntry(sessions, exId, date, kg, reps){
  sessions.push({ id:"s"+date, type:"push", variant:"main", date, cycleAt:0, cycleCompleted:false,
    entries:[{ exerciseId:exId, sets:[{kg,reps},{kg,reps},{kg,reps}] }] });
}

const app = loadApp();
const seed = app.get("SEED");

// SEED increment fixes
for (const id of ["db_hammercurl","db_goblet_squat","db_stepup","lunge_l1_split_squat","lunge_l2_reverse","lunge_l3_forward","lunge_l4_walking"]){
  assert.equal(seed.exercises[id].increment, 2, id+" increment must be corrected to 2");
}

// one allMax session is NOT enough to bump weight (was: enough) — needs 2 consecutive.
// Weight is kept well under the 36kg/hand DB ceiling here (20kg) so this exercises the
// plain weight-increase path, not the ceiling path (that's the next block below).
let S = JSON.parse(JSON.stringify(seed));
S.gami = {};
withEntry(S.sessions, "db_flachbank", "2026-06-01", 20, 12); // repMax is 12 -> at top of range
app.setS(S);
let sg = app.call("suggest", "db_flachbank");
assert.equal(sg.sets[0].kg, 20, "a single top-of-range session must not raise the weight yet");

withEntry(app.S().sessions, "db_flachbank", "2026-06-08", 20, 12); // 2nd consecutive top-of-range session
sg = app.call("suggest", "db_flachbank");
assert.equal(sg.sets[0].kg, 22, "2 consecutive top-of-range sessions must raise the weight by the increment (db_flachbank increment is 2)");

// regression rule: one below-range session is NOT enough to drop weight (was: enough at >=2 sets)
S = JSON.parse(JSON.stringify(seed));
S.gami = {};
withEntry(S.sessions, "db_flachbank", "2026-06-01", 20, 5); // repMin is 8 -> below range
app.setS(S);
sg = app.call("suggest", "db_flachbank");
assert.equal(sg.sets[0].kg, 20, "a single below-range session must not drop the weight yet");

withEntry(app.S().sessions, "db_flachbank", "2026-06-08", 20, 5); // 2nd consecutive below-range session
sg = app.call("suggest", "db_flachbank");
assert.equal(sg.sets[0].kg, 18, "2 consecutive below-range sessions must drop the weight by the increment");

// weight ceiling: DB exercise at 36kg/hand stays at 36kg and does not exceed it via suggest()
S = JSON.parse(JSON.stringify(seed));
S.gami = {};
withEntry(S.sessions, "db_flachbank", "2026-06-01", 36, 12);
withEntry(S.sessions, "db_flachbank", "2026-06-08", 36, 12);
app.setS(S);
sg = app.call("suggest", "db_flachbank");
assert.equal(sg.sets[0].kg, 36, "at the DB ceiling, suggest() must not propose more weight");

// ceiling expansion: only applied by doFinish's post-session hook, not by suggest() itself
const before = app.S().exercises.db_flachbank.repMax;
app.call("checkCeilingExpansion");
const after = app.S().exercises.db_flachbank.repMax;
assert.equal(after, before+3, "2 consecutive at-ceiling, top-of-range sessions must expand repMax by 3 once checkCeilingExpansion runs");

// calling suggest() again (simulating repeated home-screen renders) must NOT re-expand repMax on its own
app.call("suggest", "db_flachbank");
app.call("suggest", "db_flachbank");
assert.equal(app.S().exercises.db_flachbank.repMax, after, "suggest() must be side-effect-free — repeated calls must not keep expanding repMax");

console.log("OK");
