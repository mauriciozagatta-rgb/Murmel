"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP_PATH = path.join(__dirname, "..", "Murmel.html");

function extractInlineScript(html) {
  const scripts = [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  const inline = scripts.find(m => !/\bsrc=/.test(m[1] || ""));
  if (!inline) throw new Error("qa-harness: could not find the inline application <script> block in Murmel.html");
  return inline[2];
}

function makeStubElement() {
  const el = {
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: {},
    dataset: {},
    children: [],
    _innerHTML: "",
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) { this._innerHTML = v; },
    appendChild(){ return el; },
    addEventListener(){},
    removeEventListener(){},
    scrollIntoView(){},
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    click(){},
    remove(){},
  };
  return el;
}

function buildSandbox() {
  const lsStore = new Map();
  const swStore = new Map();
  const sandbox = {};

  sandbox.console = console;
  sandbox.Date = Date;
  sandbox.Math = Math;
  sandbox.JSON = JSON;
  sandbox.setTimeout = setTimeout;
  sandbox.clearTimeout = clearTimeout;
  /* setInterval is intentionally a no-op, not Node's real timer: the app starts a
     real recurring interval (startSessTimer, for the live session-duration readout)
     as a side effect of rendering the "session" view with an active draft. A real
     setInterval never clears itself and would keep the test's Node process alive
     forever, hanging `node tests/qa/*.test.js` instead of exiting. Nothing in this
     plan's tests asserts on the live-updating timer text, so a fake handle is safe. */
  let _fakeIntervalId = 0;
  sandbox.setInterval = () => (++_fakeIntervalId);
  sandbox.clearInterval = () => {};
  sandbox.Blob = Blob;
  sandbox.URL = URL;
  sandbox.google = undefined;

  sandbox.navigator = { onLine: true, vibrate(){ return true; } };

  sandbox.localStorage = {
    getItem: k => (lsStore.has(k) ? lsStore.get(k) : null),
    setItem: (k, v) => { lsStore.set(k, String(v)); },
    removeItem: k => { lsStore.delete(k); },
  };

  sandbox.window = sandbox; // vm treats `sandbox` itself as the global object
  sandbox.scrollTo = () => {}; // render()'s go()-triggered scroll-to-top; not meaningful headlessly
  sandbox.window.storage = {
    async get(key) { return swStore.has(key) ? { key, value: swStore.get(key) } : null; },
    async set(key, value) { swStore.set(key, value); return { key, value }; },
    async delete(key) { swStore.delete(key); return { key, deleted: true }; },
  };

  sandbox.fetch = async () => { throw new Error("qa-harness: fetch not stubbed for this test — set sandbox.fetch before calling"); };

  const stubEl = makeStubElement();
  sandbox.document = {
    getElementById() { return stubEl; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return makeStubElement(); },
    addEventListener() {},
    body: stubEl,
  };

  return { sandbox, lsStore, swStore };
}

function loadApp() {
  const html = fs.readFileSync(APP_PATH, "utf8");
  const src = extractInlineScript(html);
  const { sandbox } = buildSandbox();
  vm.createContext(sandbox);

  const bridge = `
;globalThis.__murmel = {
  getS: () => (typeof S === "undefined" ? undefined : S),
  setS: (v) => { S = v; },
  call: (name, ...args) => (0, eval(name))(...args),
  get: (name) => (0, eval(name)),
};
`;
  vm.runInContext(src + "\n" + bridge, sandbox, { filename: "Murmel.html (inline script)" });

  return {
    sandbox,
    S: () => sandbox.__murmel.getS(),
    setS: v => sandbox.__murmel.setS(v),
    call: (name, ...args) => sandbox.__murmel.call(name, ...args),
    get: name => sandbox.__murmel.get(name),
  };
}

module.exports = { loadApp, extractInlineScript, APP_PATH };
