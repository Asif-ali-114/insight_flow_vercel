"use strict";
const { page, pageHero, ctaBand, esc } = require("../shell");
const includes = ["Executive summary", "Business question", "Dataset overview", "Data quality findings", "Methodology", "Key performance indicators", "Visualizations", "Major observations", "Limitations and assumptions", "Practical recommendations", "Suggested next steps"];

const body = `<div class="no-print">${pageHero("Business intelligence", "From raw records to decisions you can explain",
  "Business intelligence is the habit of looking at reliable numbers regularly. Dashboards give you the live view; analysis reports explain what the numbers mean, what they cannot tell you, and what to check next.")}
<section class="section"><div class="container">
<div class="section-head"><h2>Collecting data is not the same as using it</h2></div>
<div class="grid cols-3">
<div class="card"><span class="pill">Raw data</span><h3 style="margin-top:10px">What happened</h3><p class="muted" style="margin:0">Raw data tells you which transactions occurred: thousands of rows that nobody reads end to end.</p></div>
<div class="card"><span class="pill teal">Analysis</span><h3 style="margin-top:10px">What it might mean</h3><p class="muted" style="margin:0">Analysis explains trends, performance differences, possible causes and the questions worth investigating next. It supports decisions; it does not make them.</p></div>
<div class="card"><span class="pill">Dashboards</span><h3 style="margin-top:10px">What to watch</h3><p class="muted" style="margin:0">A well-designed dashboard lets decision-makers monitor the metrics that matter without repeatedly working through large spreadsheets. Reliable analysis helps you make more informed choices; it does not promise higher profit.</p></div>
</div></div></section>

<section class="section alt"><div class="container">
<div class="section-head"><h2>What a professional analysis report includes</h2><p>Reports help decision-makers communicate findings, compare performance, document assumptions and take informed action. A good one is honest about what the data cannot show.</p></div>
<ol class="grid cols-3" style="list-style:none;padding:0">${includes.map((t, i) => `<li class="card" style="padding:14px 18px;margin:0"><strong style="color:var(--teal)">${i + 1}.</strong> ${esc(t)}</li>`).join("")}</ol>
<div class="card" style="margin-top:24px"><h3>Example scenario</h3><p class="muted" style="margin:0">A retailer gives us six months of sales records. We clean the records, calculate monthly revenue, compare product categories, check for seasonal patterns and highlight products with declining sales. The report below is that exact scenario on synthetic data. Every figure is calculated live from the sample dataset.</p></div>
</div></section>

<section class="section"><div class="container">
<div class="section-head"><h2>Sample report preview</h2></div>
<div class="btn-row">
<button type="button" class="btn btn-primary btn-sm" data-act="report-print">Print or save as PDF</button>
<button type="button" class="btn btn-secondary btn-sm" data-act="report-csv">Download report data (CSV)</button>
</div>
<p class="small muted" style="margin-top:10px">“Print or save as PDF” opens your browser’s print dialog (choose “Save as PDF”). The report layout is print-ready; no server is involved.</p>
</div></section></div>
<section class="section" style="padding-top:0"><div class="container"><div id="report"><div class="loading" role="status">Building the sample report…</div></div></div></section>
<div class="no-print">${ctaBand("Want a report like this on your data?")}</div>`;

module.exports = [{ file: "business-intelligence.html", html: page({ file: "business-intelligence.html", title: "Business Intelligence and Sample Analysis Report",
  description: "What a professional data analysis report contains, with a live sample report built from synthetic retail sales data: KPIs, charts, observations, limitations and recommendations.",
  chart: true, scripts: ["js/data-prep.js", "js/engine.js", "js/report.js"], body }) }];
