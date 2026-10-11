/* Whole-site browser test. Usage: node tests/browser-site.js [baseUrl] [screenshotDir]
   Needs Playwright and a static server (e.g. `python3 -m http.server 8080`). */
"use strict";
const { chromium } = require("playwright"); const fs = require("fs");
const BASE = process.argv[2] || "http://localhost:8080", SHOTS = process.argv[3] || null;
const PAGES = ["index", "services", "dashboards", "dashboard", "data-cleaning", "business-intelligence", "case-studies", "process", "pricing", "about", "faq", "contact", "404"].map((p) => p + ".html");
let fails = 0, checks = 0; const ok = (c, m) => { checks++; if (!c) { fails++; console.log("  FAIL: " + m); } };
const FONT = /fonts\.(googleapis|gstatic)/;
function watch(p, errs) {
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push("console: " + m.text()); });
  p.on("requestfailed", (r) => { if (!FONT.test(r.url())) errs.push("requestfailed: " + r.url()); });
  p.on("response", (r) => { if (r.status() >= 400 && !FONT.test(r.url())) errs.push("http " + r.status() + ": " + r.url()); });
}
(async () => {
  const b = await chromium.launch(); const links = new Map();
  for (const vp of [{ n: "desktop", w: 1440, h: 900 }, { n: "tablet", w: 768, h: 900 }, { n: "mobile", w: 360, h: 780 }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
    for (const file of PAGES) {
      const p = await ctx.newPage(), errs = []; watch(p, errs);
      const url = BASE + "/" + file + (file === "dashboard.html" ? "?id=executive" : ""); await p.goto(url); await p.waitForTimeout(900);
      const info = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h1: document.querySelectorAll("h1").length, nav: !!document.querySelector(".site-header .brand"), footer: !!document.querySelector(".site-footer"), title: document.title, desc: !!document.querySelector('meta[name="description"]'),
        hrefs: Array.from(document.querySelectorAll("a[href]")).map((a) => a.getAttribute("href")), ids: Array.from(document.querySelectorAll("[id]")).map((e) => e.id), emptyBtn: Array.from(document.querySelectorAll("button")).filter((x) => !x.textContent.trim() && !x.getAttribute("aria-label")).length,
        imgNoAlt: Array.from(document.querySelectorAll("img:not([alt])")).length, unlabeled: Array.from(document.querySelectorAll("input:not([type=hidden]):not([type=search]),select,textarea")).filter((c) => !(c.labels && c.labels.length) && !c.getAttribute("aria-label")).map((c) => c.id) }));
      const tag = `[${vp.n}] ${file}`;
      ok(info.sw <= info.cw + 1, `${tag} horizontal overflow ${info.sw}>${info.cw}`); ok(info.h1 === 1, `${tag} h1 count ${info.h1}`); ok(info.nav && info.footer, `${tag} header/footer`); ok(info.desc, `${tag} meta description`);
      ok(info.emptyBtn === 0, `${tag} buttons without names`); ok(info.imgNoAlt === 0, `${tag} images without alt`); ok(info.unlabeled.length === 0, `${tag} unlabeled controls ${info.unlabeled}`);
      errs.forEach((e) => ok(false, `${tag} ${e}`));
      if (vp.n === "desktop") info.hrefs.forEach((h) => { if (!/^(mailto:|#|https?:)/.test(h) && !links.has(h)) links.set(h, file); else if (h.startsWith("#") && h.length > 1 && !info.ids.includes(h.slice(1))) ok(false, `${tag} anchor ${h} has no target`); });
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/site-${vp.n}-${file.replace(".html", "")}.png`, fullPage: true });
      await p.close();
    }
    await ctx.close();
  }
  // internal link integrity (dedupe query strings & anchors)
  const ctx = await b.newContext(); const seen = new Set();
  for (const [h, from] of links) { const clean = h.split("#")[0]; if (!clean || seen.has(clean)) continue; seen.add(clean); const r = await ctx.request.get(BASE + "/" + clean); ok(r.status() === 200, `link ${h} (from ${from}) -> ${r.status()}`); }
  // cross-page anchors e.g. services.html#sales
  const sp = await ctx.newPage(); await sp.goto(BASE + "/services.html"); const sIds = await sp.evaluate(() => Array.from(document.querySelectorAll("[id]")).map((e) => e.id));
  for (const [h, from] of links) if (h.startsWith("services.html#")) ok(sIds.includes(h.split("#")[1]), `anchor ${h} exists`);
  await sp.close();

  /* ---------- home ---------- */
  const hp = await ctx.newPage(); const herr = []; watch(hp, herr); await hp.goto(BASE + "/index.html"); await hp.waitForSelector("#home-dash .kpi"); await hp.waitForSelector("#hp-line");
  ok(await hp.locator("#home-dash .kpi").count() === 4, "home dashboard has 4 KPIs");
  const rev0 = await hp.locator("#home-dash .kpi .value").first().innerText(); await hp.selectOption("#d-home-f-category", "Software"); const rev1 = await hp.locator("#home-dash .kpi .value").first().innerText();
  ok(rev0 !== rev1, `home category filter changes revenue (${rev0} -> ${rev1})`); await hp.click('#home-dash [data-act="reset"] >> nth=0'); ok(await hp.locator("#home-dash .kpi .value").first().innerText() === rev0, "home reset restores revenue");
  ok(await hp.locator("#services article").count() === 10, "10 service cards"); ok(await hp.locator(".problem").count() === 8, "8 problem cards");
  // mobile menu
  await hp.setViewportSize({ width: 390, height: 800 }); await hp.click(".menu-toggle"); ok(await hp.locator("#main-nav").isVisible(), "mobile nav opens"); ok(await hp.getAttribute(".menu-toggle", "aria-expanded") === "true", "aria-expanded"); await hp.keyboard.press("Escape"); ok(!(await hp.locator("#main-nav").isVisible()), "Escape closes nav");
  herr.forEach((e) => ok(false, "home " + e)); await hp.close();

  /* ---------- case studies: every figure filled ---------- */
  const cp = await ctx.newPage(); const cerr = []; watch(cp, cerr); await cp.goto(BASE + "/case-studies.html"); await cp.waitForSelector("body[data-cases-ready]");
  ok(await cp.locator("article.case").count() === 6, "6 case studies"); ok(await cp.locator('[data-f]').evaluateAll((n) => n.every((x) => x.textContent !== "…" && !/NaN|undefined|Infinity/.test(x.textContent))), "all case figures filled and valid");
  ok(await cp.locator("canvas").evaluateAll((cs) => cs.every((c) => window.Chart.getChart(c))), "case charts drawn"); cerr.forEach((e) => ok(false, "cases " + e)); await cp.close();

  /* ---------- pricing from config ---------- */
  const pp = await ctx.newPage(); await pp.goto(BASE + "/pricing.html"); await pp.waitForSelector(".price-card"); const prices = await pp.locator(".price").allInnerTexts();
  ok(prices.length === 4 && /\$25/.test(prices[0]) && /\$59/.test(prices[1]) && /\$129/.test(prices[2]) && /\$99/.test(prices[3]) && /month/.test(prices[3]) && /Starting at/.test(prices[0]), "pricing values: " + prices.join(" | "));
  ok((await pp.locator("#scope-note").innerText()).length > 50, "scope note shown"); ok(await pp.locator('a:has-text("Request a Custom Quote")').count() === 1, "custom quote link"); await pp.close();

  /* ---------- contact: validation, mailto honesty, endpoint success/failure ---------- */
  const kp = await ctx.newPage(); await kp.goto(BASE + "/contact.html");
  await kp.click("#submit-btn"); ok(await kp.locator(".form-field.invalid").count() >= 6, "empty submit flags required fields"); ok(/fix/i.test(await kp.locator("#form-status").innerText()), "error status shown");
  await kp.fill("#name", "Test User"); await kp.fill("#email", "not-an-email"); await kp.fill("#company", "Co"); await kp.selectOption("#service", "sales"); await kp.selectOption("#timeframe", "Flexible"); await kp.fill("#description", "short");
  await kp.click("#submit-btn"); ok(/valid email/.test(await kp.locator("#email-err").innerText()), "email format message"); ok(/20 characters/.test(await kp.locator("#description-err").innerText()), "description length message");
  await kp.fill("#email", "a@b.co"); await kp.fill("#description", "We want to understand our monthly sales by product.");
  await kp.evaluate(() => { window.__nav = null; }); await kp.click("#submit-btn").catch(() => {});
  const stText = await kp.locator("#form-status").innerText(); ok(/Nothing has been sent yet/.test(stText) && !/thank you|successfully sent/i.test(stText), "mailto mode never claims it was sent");
  await kp.close();
  for (const [code, expectOk] of [[200, true], [500, false]]) {
    const ep = await ctx.newPage(); await ep.route("**/js/config.js", async (r) => { const t = await (await r.fetch()).text(); await r.fulfill({ contentType: "application/javascript", body: t.replace('method: "mailto",', 'method: "endpoint",').replace('endpoint: ""', 'endpoint: "https://forms.example.test/f/abc"') }); });
    let posted = null; await ep.route("https://forms.example.test/**", async (r) => { if (r.request().method() === "POST") posted = r.request().postDataJSON(); await r.fulfill({ status: r.request().method() === "OPTIONS" ? 204 : code, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" }, contentType: "application/json", body: "{}" }); });
    await ep.goto(BASE + "/contact.html"); await ep.fill("#name", "T"); await ep.fill("#email", "a@b.co"); await ep.fill("#company", "Co"); await ep.selectOption("#service", "sales"); await ep.selectOption("#timeframe", "Flexible"); await ep.fill("#description", "A long enough description for the form.");
    await ep.click("#submit-btn"); await ep.waitForFunction(() => /Thank you|not sent/.test(document.getElementById("form-status").textContent), null, { timeout: 5000 });
    const t = await ep.locator("#form-status").innerText(); ok(expectOk ? /Thank you/.test(t) : /not sent/.test(t) && !/Thank you/.test(t), `endpoint ${code}: ${t.slice(0, 60)}`); ok(posted && posted.email === "a@b.co" && !("website" in posted && posted.website), "payload posted without honeypot value");
    await ep.close();
  }
  const hon = await ctx.newPage(); let hits = 0; await hon.route("**/js/config.js", async (r) => { const t = await (await r.fetch()).text(); await r.fulfill({ contentType: "application/javascript", body: t.replace('method: "mailto",', 'method: "endpoint",').replace('endpoint: ""', 'endpoint: "https://forms.example.test/f/abc"') }); });
  await hon.route("https://forms.example.test/**", async (r) => { hits++; await r.fulfill({ status: 200, body: "{}" }); }); await hon.goto(BASE + "/contact.html");
  await hon.fill("#name", "T"); await hon.fill("#email", "a@b.co"); await hon.fill("#company", "Co"); await hon.selectOption("#service", "sales"); await hon.selectOption("#timeframe", "Flexible"); await hon.fill("#description", "A long enough description for the form."); await hon.evaluate(() => { document.getElementById("website").value = "spam"; });
  await hon.click("#submit-btn"); await hon.waitForTimeout(500); ok(hits === 0 && (await hon.locator("#form-status").innerText()) === "", "honeypot blocks bot submissions silently"); await hon.close();
  await b.close(); console.log(`\n${checks} checks, ${fails} failures`); process.exit(fails ? 1 : 0);
})();
