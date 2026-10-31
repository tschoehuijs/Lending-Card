const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function setup() {
  const registry = new Map();
  class HTMLElement {
    constructor() { this.isConnected = true; }
    attachShadow() {
      this.shadowRoot = { querySelector: () => ({ reportValidity: () => true }), querySelectorAll: () => [] };
    }
  }
  const context = vm.createContext({
    HTMLElement, console: { info() {} }, window: {},
    customElements: { get: (name) => registry.get(name), define: (name, value) => registry.set(name, value) },
    Intl, Date, setInterval, clearInterval, CustomEvent: class {},
    document: { hidden: false, addEventListener() {}, removeEventListener() {} }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "lending-card.js"), "utf8"), context);
  const Card = registry.get("lending-card");
  const card = new Card();
  card._render = () => {};
  const calls = [];
  card._hass = {
    states: { "todo.lending": { state: "0" } },
    locale: { language: "en", time_zone: "server" }, config: { time_zone: "Europe/Amsterdam" },
    callWS: async (data) => { calls.push(data); return { response: { "todo.lending": { items: [] } } }; },
    callService: async (...args) => { calls.push(args); }
  };
  card._config = { entity: "todo.lending", hide_completed: true, columns: 2, sort: "due" };
  return { card, calls, Card, registry };
}

test("registers card and visual editor", () => {
  const { registry } = setup();
  assert.ok(registry.has("lending-card"));
  assert.ok(registry.has("lending-card-editor"));
});
test("rejects non-todo entities", () => {
  assert.throws(() => setup().card.setConfig({ entity: "sensor.test" }), /to-do/);
});
test("hides returned items and sorts undated items last", () => {
  const { card } = setup();
  card._items = [
    { uid: "a", summary: "A", status: "needs_action" },
    { uid: "b", summary: "B", status: "completed", due: "2026-01-01" },
    { uid: "c", summary: "C", status: "needs_action", due: "2026-02-01" }
  ];
  assert.equal(card._visibleItems().map((i) => i.uid).join(","), "c,a");
  card._config.hide_completed = false;
  assert.equal(card._visibleItems().map((i) => i.uid).join(","), "c,a,b");
});
test("date-only deadline is not overdue on its due day", () => {
  const { card } = setup();
  card._today = () => "2026-10-30";
  assert.equal(card._overdue({ due: "2026-10-30", status: "needs_action" }), false);
  assert.equal(card._overdue({ due: "2026-10-29", status: "needs_action" }), true);
  assert.equal(card._overdue({ due: "2026-10-29", status: "completed" }), false);
});
test("retrieves item data through a response-enabled service call", async () => {
  const { card, calls } = setup();
  await card._refresh();
  assert.equal(calls[0].service, "get_items");
  assert.equal(calls[0].return_response, true);
  assert.equal(card._loaded, true);
});
test("uses UID to complete duplicate item names", async () => {
  const { card, calls } = setup();
  await card._toggle({ uid: "unique-123", summary: "Drill", status: "needs_action" });
  assert.equal(calls[0][1], "update_item");
  assert.equal(calls[0][2].item, "unique-123");
  assert.equal(calls[0][2].status, "completed");
});
test("undo reopens a completed item", async () => {
  const { card, calls } = setup();
  await card._toggle({ uid: "unique-123", status: "completed" });
  assert.equal(calls[0][2].status, "needs_action");
});
test("add maps borrower to description and optional date to due_date", async () => {
  const { card, calls } = setup();
  card._draft = { uid: null, summary: " Drill ", description: " Alex ", due: "2026-11-10" };
  await card._save({ preventDefault() {} });
  assert.equal(calls[0][1], "add_item");
  assert.equal(calls[0][2].item, "Drill");
  assert.equal(calls[0][2].description, "Alex");
  assert.equal(calls[0][2].due_date, "2026-11-10");
});
test("editing borrower preserves an unchanged datetime deadline", async () => {
  const { card, calls } = setup();
  card._draft = { uid: "abc", summary: "Drill", description: "Alex", due: "2026-11-10", dueChanged: false };
  await card._save({ preventDefault() {} });
  assert.equal(calls[0][2].item, "abc");
  assert.equal(calls[0][2].rename, "Drill");
  assert.equal(Object.hasOwn(calls[0][2], "due_date"), false);
});
test("failed writes keep the form and display the backend error", async () => {
  const { card } = setup();
  card._hass.callService = async () => { throw new Error("Write failed"); };
  card._draft = { uid: null, summary: "Drill", description: "Alex", due: "" };
  await card._save({ preventDefault() {} });
  assert.ok(card._draft);
  assert.equal(card._formError, "Write failed");
  assert.equal(card._busy, false);
});
test("malformed response produces an error instead of an empty success", async () => {
  const { card } = setup();
  card._hass.callWS = async () => ({});
  await card._refresh();
  assert.match(card._error, /unexpected/);
  assert.equal(card._loaded, false);
});
