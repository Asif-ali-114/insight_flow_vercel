/* Browser test for the data-cleaning demo. Usage: node tests/browser-cleaning.js [baseUrl] */
"use strict";
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path"); const os = require("os");
const BASE = process.argv[2] || "http://localhost:8080"; let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log("  FAIL: " + m); } };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(BASE + "/data-cleaning.html"); await p.waitForSelector(".clean-metrics .kpi");
  const metric = async (label) => p.evaluate((l) => { const k = Array.from(document.querySelectorAll(".clean-metrics .kpi")).find((n) => n.querySelector(".label").textContent === l); return k && k.querySelector(".value").textContent; }, label);
  ok(await metric("Records reviewed") === "11", "reviewed 11"); ok(await metric("Duplicate rows identified") === "1", "dup 1");
  ok(await metric("Missing values detected") === "2", "missing 2"); ok(await metric("Records needing manual review") === "5", "flagged 5 got " + await metric("Records needing manual review"));
  ok(await metric("Completeness before") === "95.5%", "completeness before " + await metric("Completeness before")); ok(await metric("Completeness after") === "95.0%", "completeness after " + await metric("Completeness after"));
  // tabs
  ok(await p.locator("#cmp-panel table").count() === 2, "side by side shows two tables");
  await p.click("#tab-before"); ok(await p.locator("#cmp-panel table").count() === 1 && /Before/.test(await p.locator("#cmp-panel h3").innerText()), "before tab");
  await p.click("#tab-after"); ok(!/\[missing\]/.test("") && (await p.locator("#cmp-panel tbody tr").count()) === 10, "after tab has 10 rows (dup removed): " + await p.locator("#cmp-panel tbody tr").count());
  await p.click("#tab-side");
  // rule changes
  await p.selectOption("#f-dup", "keep"); ok(await p.locator("#cmp-panel .cmp-grid table >> nth=1").locator("tbody tr").count() === 11, "keep duplicates shows 11 rows");
  ok(await metric("Records needing manual review") === "6", "keep: flagged 6");
  await p.selectOption("#f-dup", "remove");
  await p.selectOption("#f-conv", "mdy"); await p.click("#tab-after");
  const afterTxt = await p.locator("#cmp-panel").innerText(); ok(afterTxt.includes("2026-05-01"), "mdy reads 05/01/2026 as 1 May"); await p.click("#tab-side");
  await p.selectOption("#f-conv", "dmy"); await p.click("#tab-after"); ok((await p.locator("#cmp-panel").innerText()).includes("2026-01-05"), "dmy reads 05/01/2026 as 5 Jan"); await p.click("#tab-side");
  await p.selectOption("#f-kind", "duplicate"); ok(await p.locator("#cmp-panel .cmp-grid table >> nth=0").locator("tbody tr").count() === 1, "filter duplicate: 1 row in before");
  await p.selectOption("#f-kind", "All");
  // steps toggle
  await p.click('[data-act="steps"]'); ok(await p.locator("#clean-steps li").count() === 8, "8 steps shown"); ok(await p.getAttribute('[data-act="steps"]', "aria-expanded") === "true", "aria-expanded true");
  // downloads
  for (const [act, name, needle] of [["dl-clean", "cleaned-sample.csv", "Review Status"], ["dl-report", "quality-report.csv", "Records reviewed"]]) {
    const [d] = await Promise.all([p.waitForEvent("download"), p.click(`[data-act="${act}"]`)]); ok(d.suggestedFilename() === name, "filename " + name);
    const txt = fs.readFileSync(await d.path(), "utf8"); ok(txt.includes(needle), name + " content"); if (act === "dl-clean") ok(txt.trim().split(/\r?\n/).length === 11, "cleaned csv 10 rows + header: " + txt.trim().split(/\r?\n/).length);
  }
  // upload validation
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "up-"));
  fs.writeFileSync(path.join(tmp, "x.txt"), "hi"); await p.setInputFiles("#f-file", path.join(tmp, "x.txt")); ok(/\.csv/.test(await p.locator("[data-upload-msg]").innerText()), "rejects non-csv");
  fs.writeFileSync(path.join(tmp, "bad.csv"), "a,b\n1,2\n"); await p.setInputFiles("#f-file", path.join(tmp, "bad.csv")); await p.waitForFunction(() => /Missing expected/.test(document.querySelector("[data-upload-msg]").textContent), null, { timeout: 3000 }).catch(() => {}); ok(/Missing expected column/.test(await p.locator("[data-upload-msg]").innerText()), "rejects wrong headers");
  fs.writeFileSync(path.join(tmp, "good.csv"), 'order id,Product,date,qty,price\nA1,"<img src=x onerror=alert(1)>",2026-01-01,1,10\nA2,pen,01/02/2026,2,"1,000"\n'); await p.setInputFiles("#f-file", path.join(tmp, "good.csv")); await p.waitForFunction(() => /Loaded 2 rows/.test(document.querySelector("[data-upload-msg]").textContent), null, { timeout: 3000 }).catch(() => {});
  ok(/Loaded 2 rows/.test(await p.locator("[data-upload-msg]").innerText()), "accepts good csv"); ok(await metric("Records reviewed") === "2", "metrics update for upload");
  ok(await p.locator("#cmp-panel img").count() === 0, "uploaded markup is escaped, not injected");
  await p.click('[data-act="restore"]'); ok(await metric("Records reviewed") === "11", "restore sample");
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "no horizontal overflow");
  errs.forEach((e) => ok(false, e)); await b.close(); console.log(`${checks} checks, ${fails} failures`); process.exit(fails ? 1 : 0);
})();
