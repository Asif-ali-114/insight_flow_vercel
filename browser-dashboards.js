/* Browser test for all dashboards. Usage: node tests/browser-dashboards.js [baseUrl] [screenshotDir]
   Requires Playwright (npm i -D playwright) and a static server on baseUrl (default http://localhost:8080). */
"use strict";
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:8080";
const SHOTS = process.argv[3] || null;
const IDS = ["executive","sales","profitability","customers","inventory","finance","marketing","education","quality","monthly","web","operations"];
let failures = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { failures++; console.log("  FAIL: " + m); } };

(async () => {
  const browser = await chromium.launch();
  for (const vp of [{ name: "desktop", width: 1366, height: 900 }, { name: "mobile", width: 375, height: 800 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, acceptDownloads: true });
    for (const id of IDS) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
      page.on("requestfailed", (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errors.push("requestfailed: " + r.url()); });
      page.on("response", (r) => { if (r.status() >= 400 && !/fonts\.(googleapis|gstatic)/.test(r.url())) errors.push("http " + r.status() + ": " + r.url()); });
      console.log(`[${vp.name}] ${id}`);
      await page.goto(`${BASE}/dashboard.html?id=${id}`);
      await page.waitForSelector(".kpi", { timeout: 8000 }).catch(() => ok(false, "no KPI rendered"));
      const info = await page.evaluate(() => {
        const el = document.getElementById("dash-mount");
        return { kpis: el.querySelectorAll(".kpi").length, canvases: el.querySelectorAll("canvas").length,
          charts: Array.from(el.querySelectorAll("canvas")).filter((c) => window.Chart.getChart(c)).length,
          scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
          err: !!el.querySelector(".error-box"), kpiText: Array.from(el.querySelectorAll(".kpi .value")).map((n) => n.textContent) };
      });
      ok(info.kpis >= 4, "KPIs rendered: " + info.kpis);
      ok(!info.err, "dashboard shows error box");
      ok(info.canvases > 0 && info.charts === info.canvases, `charts live ${info.charts}/${info.canvases}`);
      ok(info.scrollW <= info.clientW + 1, `horizontal overflow ${info.scrollW}>${info.clientW}`);
      ok(!info.kpiText.some((t) => /NaN|Infinity|undefined|null/.test(t)), "bad KPI text: " + info.kpiText.join("|"));

      if (vp.name === "desktop") {
        // filter -> rows change -> reset restores
        const base = await page.evaluate(() => document.querySelector("#dash-mount .dash").parentElement.__dash.rows().length);
        const changed = await page.evaluate(() => {
          const el = document.getElementById("dash-mount"), sel = Array.from(el.querySelectorAll(".dash-toolbar select[data-f]:not([data-part])")).find((s) => s.options.length > 1 && !s.disabled);
          if (!sel) return null;
          sel.value = sel.options[sel.options.length > 2 ? 2 : 1].value; sel.dispatchEvent(new Event("change", { bubbles: true }));
          return { rows: el.__dash.rows().length, state: el.__dash.getState() };
        });
        if (changed) {
          ok(changed.rows <= base, "filter did not reduce/keep rows");
          // KPI/table agree: first KPI should differ from baseline or rows < base (soft)
          await page.click('[data-act="reset"]');
          const after = await page.evaluate(() => document.getElementById("dash-mount").__dash.rows().length);
          ok(after === base, `reset restored rows (${after} vs ${base})`);
        }
        // table sort + search + pagination do not throw
        await page.click('table.data thead th button >> nth=0');
        const nxt = page.locator('[data-act="next"]'); if (await nxt.isEnabled()) await nxt.click();
        await page.fill("[data-tsearch]", "zzzzqq");
        ok((await page.locator(".table-card").innerText()).includes("No rows match"), "table empty search message");
        await page.fill("[data-tsearch]", "");
        // export
        const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }).catch(() => null), page.click('[data-act="export"]')]);
        ok(!!dl, "export produced a download");
        if (dl) { const fs = require("fs"); const p = await dl.path(); const txt = fs.readFileSync(p, "utf8"); const lines = txt.trim().split(/\r?\n/).length; ok(lines > 1, "export has rows: " + lines); }
        // empty state: choose a text filter nonsense, or contradict selects
        const empty = await page.evaluate(() => {
          const el = document.getElementById("dash-mount"), d = el.__dash;
          const txt = el.querySelector('.dash-toolbar input[type=search]');
          if (txt) { txt.value = "zzzzqq"; txt.dispatchEvent(new Event("input", { bubbles: true })); return "text"; }
          return null;
        });
        if (empty) { await page.waitForTimeout(400); ok(await page.locator(".empty-state.show").count() === 1, "empty state shown"); await page.click('[data-act="reset"] >> nth=0'); ok(await page.locator(".empty-state.show").count() === 0, "empty state cleared on reset"); }
      }
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${vp.name}-${id}.png`, fullPage: true });
      errors.forEach((e) => ok(false, e));
      await page.close();
    }
    await ctx.close();
  }

  // exact export check: filtered CSV rows == filtered rows on screen
  {
    const ctx2 = await browser.newContext({ acceptDownloads: true }); const pg = await ctx2.newPage();
    await pg.goto(`${BASE}/dashboard.html?id=executive`); await pg.waitForSelector(".kpi");
    await pg.selectOption("#d-executive-f-category", "Software"); await pg.selectOption("#d-executive-f-region", "North");
    const exp = await pg.evaluate(() => document.getElementById("dash-mount").__dash.rows().map((r) => r.revenue));
    const kpi = await pg.locator(".kpi .value").first().innerText();
    const [dl] = await Promise.all([pg.waitForEvent("download"), pg.click('[data-act="export"]')]);
    const lines = require("fs").readFileSync(await dl.path(), "utf8").trim().split(/\r?\n/);
    ok(lines.length - 1 === exp.length, `export rows ${lines.length - 1} == filtered rows ${exp.length}`);
    ok(lines.slice(1).every((l) => /Software/.test(l) && /North/.test(l)), "every exported row matches both filters");
    const sum = Math.round(exp.reduce((a, b) => a + b, 0)); ok(kpi === "$" + sum.toLocaleString("en-US"), `KPI ${kpi} equals sum of filtered rows $${sum.toLocaleString("en-US")}`);
    await ctx2.close();
  }
  await browser.close();
  console.log(`\n${checks} checks, ${failures} failures`);
  process.exit(failures ? 1 : 0);
})();
