"use strict";
const { page, ctaBand, esc, CFG } = require("../shell");
const services = require("../content/services");
const problems = [
  ["Data spread across spreadsheets", "Nobody has the full picture and files disagree.", "We consolidate sources into one documented dataset."],
  ["Inconsistent and duplicated records", "Totals are wrong and trust in reports erodes.", "Rule-based cleaning and validation with a change log."],
  ["Manual report preparation", "Hours are spent copying instead of analyzing.", "Python workflows that rebuild the report from new files."],
  ["Unclear sales performance", "It is hard to say what is selling and when.", "Sales analysis and a dashboard with filters."],
  ["Unclear expenses and margins", "Cost creep and low-margin products go unnoticed.", "Expense and profitability views with stated formulas."],
  ["No central view of KPIs", "Each person checks a different number.", "One dashboard with agreed KPI definitions."],
  ["Hard to compare months", "Trends and one-off spikes are hard to separate.", "Period-comparison reporting with safe percentage changes."],
  ["Limited visibility of stock and customers", "Stockouts and lapsed customers appear too late.", "Inventory and customer analytics."]
];
const body = `
<section class="hero"><div class="container hero-grid">
<div>
<span class="eyebrow">Data analytics services</span>
<h1>Turn Your Business Data Into Clear, Actionable Insights.</h1>
<p class="lead">We help businesses clean their data, understand performance, uncover opportunities, and build interactive dashboards that make complex information easier to act on.</p>
<div class="btn-row"><a class="btn btn-primary" href="contact.html">Discuss Your Project</a><a class="btn btn-secondary" href="dashboards.html">Explore Interactive Dashboards</a></div>
<div class="hero-badges"><span data-icon="check"></span><span>Excel and CSV data cleaning</span><span data-icon="check"></span><span>Python data analysis</span><span data-icon="check"></span><span>Business intelligence dashboards</span></div>
</div>
<div id="hero-preview" aria-live="polite"><div class="loading" role="status">Loading preview…</div></div>
</div></section>

<section class="section"><div class="container">
<div class="section-head"><span class="eyebrow">Who it is for</span><h2>The problems we help with</h2><p>Small businesses, growing companies, e-commerce stores, retailers and educational institutions often share the same data headaches.</p></div>
<div class="grid cols-4">${problems.map((p) => `<div class="card problem"><h3 style="font-size:1rem">${esc(p[0])}</h3><span class="tag">Consequence</span><p class="small muted" style="margin:0">${esc(p[1])}</p><span class="fix">How we help</span><p class="small muted" style="margin:0">${esc(p[2])}</p></div>`).join("")}</div>
</div></section>

<section class="section alt" id="services"><div class="container">
<div class="section-head"><span class="eyebrow">Services</span><h2>What we do</h2><p>Ten services, each with a clear deliverable. <a href="services.html">See every service in detail</a>.</p></div>
<div class="grid cols-3">${services.map((s) => `<article class="card hover"><div class="card-icon" data-icon="${s.icon}" data-icon-class="lg"></div><h3>${esc(s.title)}</h3><p class="muted" style="margin-bottom:8px">${esc(s.desc)}</p><dl><div class="dl-row"><dt>Problem solved: </dt><dd>${esc(s.solves)}</dd></div><div class="dl-row"><dt>Deliverable: </dt><dd>${esc(s.deliverable)}</dd></div></dl><a class="card-link" href="services.html#${s.id}">Service details <span data-icon="arrow"></span></a></article>`).join("")}</div>
</div></section>

<section class="section" id="preview"><div class="container">
<div class="section-head"><span class="eyebrow">Try it</span><h2>A working sample dashboard</h2><p>Change the dates or the category, or click a segment in the category chart. KPIs, charts and numbers update together. All data is synthetic.</p></div>
<div id="home-dash"><div class="loading" role="status">Loading sample dashboard…</div></div>
<p style="margin-top:18px"><a class="btn btn-secondary" href="dashboards.html">See all 12 dashboards</a></p>
</div></section>

<section class="section alt"><div class="container">
<div class="section-head"><span class="eyebrow">Why it matters</span><h2>Collecting data is not the same as using it</h2></div>
<div class="grid cols-3">
<div class="card"><h3>Raw data</h3><p class="muted" style="margin:0">Raw data tells a business what transactions occurred.</p></div>
<div class="card"><h3>Analysis</h3><p class="muted" style="margin:0">Analysis helps explain trends, performance differences, possible causes and questions worth investigating.</p></div>
<div class="card"><h3>Dashboards</h3><p class="muted" style="margin:0">A well-designed dashboard lets decision-makers monitor important metrics without repeatedly examining large spreadsheets.</p></div>
</div>
<p class="muted" style="margin-top:18px">Reliable analysis helps businesses make more informed decisions. It does not automatically increase profit, and we will not promise that it does.</p>
<div class="btn-row"><a class="btn btn-secondary" href="data-cleaning.html">Try the data-cleaning demo</a><a class="btn btn-secondary" href="business-intelligence.html">Read a sample report</a><a class="btn btn-secondary" href="process.html">See how we work</a></div>
</div></section>` + ctaBand("Tell us about your data");

module.exports = [{ file: "index.html", html: page({ file: "index.html", title: CFG.brand.name + ": Data Analytics Services and Interactive Dashboards",
  description: "Data analytics services for small businesses: Excel data cleaning, Python data analysis, sales analysis, interactive business intelligence dashboards and reporting automation.",
  chart: true, scripts: ["js/data-prep.js", "js/cleaning-engine.js", "js/engine.js", "js/dashboards-core.js", "js/home.js"], body }) }];
