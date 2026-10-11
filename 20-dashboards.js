"use strict";
const { page, pageHero, ctaBand, esc } = require("../shell");
const DASH_SCRIPTS = ["js/data-prep.js", "js/cleaning-engine.js", "js/engine.js", "js/dashboards-core.js", "js/dashboards-more.js", "js/dashboard-page.js"];
const IDS = [["executive","Executive Business Overview"],["sales","Sales Performance"],["profitability","Profitability Analysis"],["customers","Customer Analytics"],["inventory","Inventory and Stock Monitoring"],["finance","Financial and Expense Overview"],["marketing","Marketing Performance"],["education","Education and Student Performance"],["quality","Data Quality"],["monthly","Monthly Business Reporting"],["web","Website Analytics"],["operations","Operations and Order Fulfillment"]];

const gallery = {
  file: "dashboards.html",
  html: page({
    file: "dashboards.html", title: "Interactive Business Dashboards",
    description: "Explore 12 interactive business intelligence dashboards with working filters, charts, tables and CSV export: sales, profit, customers, inventory, finance, marketing, education, data quality and more.",
    chart: true, scripts: DASH_SCRIPTS, bodyAttrs: 'data-mode="gallery"',
    body: pageHero("Interactive dashboards", "Twelve working dashboards you can explore right now",
      "Every dashboard below filters, sorts, searches and exports. KPIs, charts and tables are all calculated from the same filtered sample dataset, so they always agree.") +
      `<section class="section"><div class="container">
<div class="notice info" role="note"><p><strong>All data is synthetic.</strong> These dashboards demonstrate what we build. They are not connected to any real company, platform or customer. Each page has a sample-dataset download so you can check the numbers yourself.</p></div>
<div style="height:20px"></div>
<div id="gallery" class="grid cols-3" aria-live="polite"></div>
<noscript><ul>${IDS.map((d) => `<li><a href="dashboard.html?id=${d[0]}">${esc(d[1])}</a></li>`).join("")}</ul></noscript>
</div></section>
<section class="section alt"><div class="container"><div class="section-head"><h2>What every dashboard includes</h2></div>
<div class="grid cols-3">
<div class="card"><h3>Linked filters</h3><p class="muted" style="margin:0">Date ranges, dropdowns and search boxes update the KPIs, charts and table together. Click a chart bar or segment where marked to cross-filter.</p></div>
<div class="card"><h3>Clear definitions</h3><p class="muted" style="margin:0">Each dashboard lists how its metrics are calculated, including the denominator of every percentage.</p></div>
<div class="card"><h3>Export and sample data</h3><p class="muted" style="margin:0">Download the filtered view as CSV, or the full sample dataset, and check the results in your own spreadsheet.</p></div>
</div></div></section>` + ctaBand("Want a dashboard built around your own KPIs?")
  })
};

const single = {
  file: "dashboard.html", noindex: false,
  html: page({
    file: "dashboard.html", title: "Interactive Dashboard",
    description: "An interactive sample business dashboard with filters, charts, a sortable table and CSV export, built on synthetic data.",
    chart: true, scripts: DASH_SCRIPTS,
    body: `<section class="page-hero"><div class="container"><p class="small" style="margin-bottom:8px"><a href="dashboards.html">&larr; All dashboards</a></p><span class="eyebrow">Interactive sample dashboard</span><h1 id="dash-title">Dashboard</h1><p class="lead" id="dash-lead"></p></div></section>
<section class="section" style="padding-top:28px"><div class="container">
<nav aria-label="Dashboards"><ul class="dash-nav" id="dash-nav"></ul></nav>
<div id="dash-mount"><div class="loading" role="status">Loading dashboard…</div></div>
</div></section>` + ctaBand("Want this dashboard on your own data?")
  })
};
module.exports = [gallery, single].map((p) => ({ file: p.file, html: p.html, noindex: p.noindex }));
