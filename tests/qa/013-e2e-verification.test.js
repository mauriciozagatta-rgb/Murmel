"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

const app = loadApp();

function sets(kg, reps, n){ return Array.from({length:n}, ()=>({kg,reps})); }

// A representative pre-migration v2 fixture: 6 sessions across push/pull/legs,
// covering all three exercise-ID-aliasing cases from the spec plus a plain PR bump.
const fixture = {
  version: 2,
  settings: { restSeconds:90, weeklyGoal:4, sound:true, vibration:true },
  bodyweight: { goalKg:85, log:[], metrics:[] },
  plan: {
    push: ["db_flachbank","db_schraegbank","cable_seitheben"],
    pull: ["cable_latzug"],
    legs: ["db_goblet_squat","cable_rdl"],
  },
  exercises: {
    db_flachbank:   { name:"Flachbank KH-Drücken", unit:"kg", repMin:8, repMax:12, increment:2, muscle:"chest" },
    db_schraegbank: { name:"Schrägbank KH-Drücken", unit:"kg", repMin:8, repMax:12, increment:2, muscle:"chest" },
    cable_seitheben:{ name:"Kabel-Seitheben", unit:"kg", repMin:12, repMax:15, increment:1.25, muscle:"shoulders" },
    cable_latzug:   { name:"Latzug (Stange)", unit:"kg", repMin:8, repMax:12, increment:5, muscle:"back" },
    db_goblet_squat:{ name:"Goblet Squat", unit:"kg", repMin:8, repMax:12, increment:1, muscle:"quads" },
    cable_rdl:      { name:"Kabel-RDL", unit:"kg", repMin:10, repMax:15, increment:2.5, muscle:"hamstrings" },
    ex1700000000:   { name:"Eigene Übung", unit:"kg", repMin:8, repMax:12, increment:2.5, muscle:"other" },
  },
  sessions: [
    { id:"s1", type:"push", date:"2026-01-05", entries:[
      { exerciseId:"db_flachbank",   sets:sets(40,10,3) },
      { exerciseId:"db_schraegbank", sets:sets(30,10,3) }, // -> quarantined (no v3 replacement)
    ]},
    { id:"s2", type:"pull", date:"2026-01-06", entries:[
      { exerciseId:"cable_latzug", sets:sets(50,8,3) },
    ]},
    { id:"s3", type:"legs", date:"2026-01-07", entries:[
      { exerciseId:"db_goblet_squat", sets:sets(20,10,3) },
      { exerciseId:"cable_rdl",       sets:sets(30,10,3) }, // -> aliased to db_rdl
    ]},
    { id:"s4", type:"push", date:"2026-01-12", entries:[
      { exerciseId:"cable_seitheben", sets:sets(10,12,3) }, // -> aliased to db_lateral_raise
      { exerciseId:"ghost_exercise",  sets:sets(5,5,3)   }, // -> quarantined (genuine corruption)
    ]},
    { id:"s5", type:"pull", date:"2026-01-13", entries:[
      { exerciseId:"ex1700000000", sets:sets(15,10,3) }, // -> custom, passthrough
    ]},
    { id:"s6", type:"legs", date:"2026-01-14", entries:[
      { exerciseId:"db_goblet_squat", sets:sets(22,10,3) }, // -> new PR over s3's 20kg
    ]},
  ],
  draft: null,
};

const preSessionCount = fixture.sessions.length;
const preTonnage = fixture.sessions.reduce((sum,s)=>sum+s.entries.reduce((n,e)=>n+e.sets.reduce((m,st)=>m+st.kg*st.reps,0),0), 0);
const orphanedIds = new Set(["db_schraegbank","ghost_exercise"]);
const orphanedTonnage = fixture.sessions.reduce((sum,s)=>sum+s.entries.filter(e=>orphanedIds.has(e.exerciseId)).reduce((n,e)=>n+e.sets.reduce((m,st)=>m+st.kg*st.reps,0),0), 0);

const { state, report } = app.call("migrate", fixture);

// no whole session ever disappears
assert.equal(state.sessions.length, preSessionCount, "migration must never delete a whole session");

// the only tonnage that disappears is exactly the quarantined tonnage
const postTonnage = state.sessions.reduce((sum,s)=>sum+s.entries.reduce((n,e)=>n+e.sets.reduce((m,st)=>m+st.kg*st.reps,0),0), 0);
assert.equal(postTonnage, preTonnage-orphanedTonnage, "post-migration tonnage must equal pre-migration tonnage minus exactly the quarantined entries' tonnage");

// nothing is silently dropped -- it's quarantined, findable, and counted in the report
assert.equal(state._orphaned.length, 2);
assert.equal(report.quarantinedCount, 2);
assert.deepEqual(new Set(state._orphaned.map(o=>o.exerciseId)), orphanedIds);

// all three aliasing cases actually happened
assert.ok(state.exercises.db_lateral_raise && !state.exercises.cable_seitheben, "case 1: cable_seitheben aliased to db_lateral_raise");
assert.ok(state.exercises.db_rdl && !state.exercises.cable_rdl, "case 1: cable_rdl aliased to db_rdl");
assert.ok(state.exercises.ex1700000000, "case 2: custom exercise passes through untouched");
assert.ok(!state.exercises.db_schraegbank, "case 3: db_schraegbank has no replacement and is gone from the catalog");

// the cycle backfill (Task 2) ran over the migrated history without corrupting it
assert.ok(state.cycle, "S.cycle must be initialized by migration");
assert.equal(state.sessions.filter(s=>s.deviation).length, 0, "backfilled history must never be flagged as deviated");

// the full v3 gamification pipeline runs end-to-end over migrated + backfilled data without throwing
app.setS(state);
app.S().gami = {};
const g = app.call("computeGami");
assert.ok(Number.isFinite(g.total) && g.total>=0, "computeGami() must produce a finite, non-negative total over real migrated history");
assert.ok(g.rank && typeof g.rank.key==="string", "computeGami() must resolve a rank");
assert.ok(g.per.some(p=>p.bd.pr>0), "the s6 goblet-squat PR (22kg over s3's 20kg) must be detected by the v3 PR logic post-migration");

console.log("OK");
