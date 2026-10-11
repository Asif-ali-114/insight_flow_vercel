/* Node unit tests for the pure logic. Run: node tests/unit.js   (no dependencies) */
"use strict";
const assert = require("assert"); const fs = require("fs"); const path = require("path"); const vm = require("vm"); const crypto = require("crypto"); const cp = require("child_process");
const U = require("../js/utils.js"), P = require("../js/data-prep.js"), C = require("../js/cleaning-engine.js");
let n = 0; const t = (name, fn) => { try { fn(); n++; console.log("  ok  " + name); } catch (e) { console.log("  FAIL " + name + "\n      " + e.message); process.exitCode = 1; } };

t("pctChange never returns Infinity or NaN for a zero/missing baseline", () => {
  assert.strictEqual(U.pctChange(10, 0), null); assert.strictEqual(U.pctChange(0, 0), null); assert.strictEqual(U.pctChange(5, null), null); assert.strictEqual(U.pctChange(NaN, 4), null);
  assert.strictEqual(U.pctChange(150, 100), 0.5); assert.strictEqual(U.pctChange(50, 100), -0.5); assert.strictEqual(U.signedPct(null), "n/a");
});
t("div returns null on zero denominator", () => { assert.strictEqual(U.div(1, 0), null); assert.strictEqual(U.div(1, 4), 0.25); });
t("formatters", () => { assert.strictEqual(U.money(1234.5), "$1,235"); assert.strictEqual(U.pct(0.1234), "12.3%"); assert.strictEqual(U.pct(null), "n/a"); assert.strictEqual(U.compactMoney(45200), "$45K"); });
t("CSV export escapes quotes/commas and neutralizes formula injection", () => {
  assert.strictEqual(U.csvEscape('a,"b"'), '"a,""b"""'); assert.strictEqual(U.csvEscape("=SUM(A1)"), "'=SUM(A1)"); assert.strictEqual(U.csvEscape(-5), "-5");
  const csv = U.toCsv([{ key: "a", label: "A" }], [{ a: "x" }]); assert.strictEqual(csv, "A\r\nx\r\n");
});

/* ---- cleaning engine on the exact example from the brief ---- */
const spec = [
  { orderId: "1001", product: "laptop", orderDate: "2026-01-05", quantity: "2", unitPrice: "500" },
  { orderId: "1002", product: "Laptop", orderDate: "05/01/2026", quantity: "1", unitPrice: "500" },
  { orderId: "1002", product: "Laptop", orderDate: "05/01/2026", quantity: "1", unitPrice: "500" },
  { orderId: "1003", product: "Mouse", orderDate: "2026/01/08", quantity: "-2", unitPrice: "15" },
  { orderId: "1004", product: "", orderDate: "2026-01-09", quantity: "1", unitPrice: "25" },
  { orderId: "1005", product: "Keyboard", orderDate: "2026-01-10", quantity: "3", unitPrice: "" }];
const res = C.processRows(spec, { dateConvention: "dmy" }); const r = res.records;
t("capitalization standardized", () => assert.strictEqual(r[0].clean.product, "Laptop"));
t("day-first convention is explicit: 05/01/2026 -> 2026-01-05", () => assert.strictEqual(r[1].clean.orderDate, "2026-01-05"));
t("month-first convention changes the result (not silently assumed)", () => assert.strictEqual(C.processRows([spec[1]], { dateConvention: "mdy" }).records[0].clean.orderDate, "2026-05-01"));
t("exact duplicate removed, first kept", () => { assert.strictEqual(r[2].status, "removed"); assert.strictEqual(r[1].status, "fixed"); assert.strictEqual(res.summary.removed, 1); });
t("negative quantity flagged, not changed or discarded", () => { assert.strictEqual(r[3].status, "flagged"); assert.strictEqual(r[3].clean.quantity, -2); });
t("missing product flagged and left blank (not guessed)", () => { assert.strictEqual(r[4].clean.product, ""); assert.strictEqual(r[4].status, "flagged"); });
t("missing price stays blank, never zero", () => { assert.strictEqual(r[5].clean.unitPrice, ""); assert.strictEqual(r[5].status, "flagged"); });
t("summary counts add up and completeness is computed", () => {
  const s = res.summary; assert.strictEqual(s.ok + s.fixed + s.flagged + s.removed, s.total); assert.strictEqual(s.missingCells, 2);
  assert.ok(Math.abs(s.completenessBefore - (1 - 2 / 24)) < 1e-9); assert.ok(Math.abs(s.completenessAfter - (1 - 2 / 20)) < 1e-9);
});
t("invalid dates and fractional quantities are flagged, never converted", () => {
  const x = C.processRows([{ orderId: "1", product: "a", orderDate: "2026-02-30", quantity: "2.5", unitPrice: "$1,180.00" }], {}).records[0];
  assert.strictEqual(x.status, "flagged"); assert.strictEqual(x.clean.unitPrice, 1180); assert.ok(x.issues.some((i) => i.code === "date_invalid")); assert.ok(x.issues.some((i) => i.code === "qty_whole"));
});
t("cleaned export excludes removed duplicates and carries review columns", () => { const rows = C.cleanedRows(res); assert.strictEqual(rows.length, 5); assert.strictEqual(rows[2].reviewStatus, "Needs review"); });

/* ---- datasets: deterministic and internally consistent ---- */
function load(name) { const w = { IF_DATA: {} }; w.window = w; vm.createContext(w); vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "data", name + ".js"), "utf8"), w); return w.IF_DATA[name]; }
const sales = P.prepareSales(load("sales"));
t("sales dataset: KPIs equal the sum of rows; margin excludes only uncosted rows", () => {
  const k = P.salesKpis(sales.rows); assert.ok(Math.abs(k.revenue - sales.rows.reduce((a, b) => a + b.revenue, 0)) < 0.01); assert.strictEqual(k.orders, sales.rows.length);
  assert.ok(k.margin > 0 && k.margin < 1); assert.strictEqual(k.uncostedRows, 0);
});
t("sales: filtering by category partitions revenue exactly", () => {
  const total = P.salesKpis(sales.rows).revenue; const parts = sales.categories.reduce((a, c) => a + P.salesKpis(sales.rows.filter((r) => r.category === c)).revenue, 0); assert.ok(Math.abs(total - parts) < 0.01);
});
t("sales: every customer has exactly one first order", () => { const c = P.customerMetrics(sales.rows); assert.strictEqual(c.newCustomers, c.unique); assert.strictEqual(c.returning, 0); });
t("sales: new + returning = unique for any month", () => { const m = sales.months[5]; const c = P.customerMetrics(sales.rows.filter((r) => r.month === m)); assert.strictEqual(c.newCustomers + c.returning, c.unique); });
t("CSV sample matches JS data row counts", () => { const csv = fs.readFileSync(path.join(__dirname, "..", "data", "sales.csv"), "utf8").trim().split(/\r?\n/); assert.strictEqual(csv.length - 1, sales.rows.length); });
t("generator is deterministic (two runs, identical files)", () => {
  const hash = () => crypto.createHash("sha256").update(["sales", "inventory", "expenses", "marketing", "students", "quality", "web", "operations"].map((f) => fs.readFileSync(path.join(__dirname, "..", "data", f + ".js"))).join("")).digest("hex");
  const a = hash(); cp.execFileSync("node", [path.join(__dirname, "..", "tools", "generate-data.js")], { stdio: "ignore" }); const b = hash(); assert.strictEqual(a, b);
});
t("operations and sales datasets reference the same orders", () => { const ops = load("operations"); assert.strictEqual(ops.rows.length, sales.rows.length); assert.strictEqual(ops.rows[0][0], sales.rows[0].id); });
t("quality dataset: documented problems are actually present", () => {
  const q = load("quality"); const objs = q.rows.map((x) => ({ orderId: x[0], product: x[2], orderDate: x[3], quantity: x[4], unitPrice: x[5], region: x[6] }));
  const s = C.processRows(objs, { dateConvention: "dmy", allowedRegions: q.allowedRegions, requiredFields: ["product", "orderDate", "quantity", "unitPrice", "region"] }).summary;
  assert.ok(s.removed >= 10 && s.missingCells > 0 && s.invalidRecords > 0 && s.formatIssueRecords > 0);
});
console.log(`\n${n} passing` + (process.exitCode ? " (with failures)" : ""));
