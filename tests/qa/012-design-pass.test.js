"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { APP_PATH, loadApp } = require("../qa-harness");

const html = fs.readFileSync(APP_PATH, "utf8");

assert.match(html, /--cardio:\s*#22D3C5/i, "cardio accent must be finalized to #22D3C5");
assert.match(html, /\.t-cardio\{--acc:var\(--cardio\); --accA:rgba\(34,211,197,\.12\); --accB:rgba\(34,211,197,\.35\);\}/, "t-cardio theming block must exist alongside t-push/t-pull/t-legs");
assert.match(html, /\.lbl\{[^}]*letter-spacing:\.1em/, ".lbl must match h2's letter-spacing (.1em) for consistency");

const app = loadApp();
const svg = app.call("inclineMotifSvg");
assert.match(svg, /<svg/);
assert.match(svg, /polyline/);
assert.match(svg, /var\(--cardio\)/);

console.log("OK");
