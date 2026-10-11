"use strict";
const { page, pageHero, ctaBand, esc } = require("../shell");
const f = (k) => `<strong data-f="${k}">…</strong>`;
const cases = [
  { id: "retail", title: "Retail Sales Analysis", chart: "cs-retail", dash: "executive",
    context: "A small retailer with 30 products wants to understand its first six months of sales.", problem: "Monthly totals exist, but nobody has compared quarters, categories or individual products.",
    data: "About 1,400 order lines (January–June 2025): date, product, category, region, quantity, discount and unit cost.", approach: "Clean the records, calculate monthly revenue and margin, compare Q1 with Q2, rank categories, and list products whose revenue fell.", tools: "Python (pandas), Chart.js",
    findings: [`Revenue for the period was ${f("retailRev")} at a gross margin of ${f("retailMargin")}.`, `Q2 revenue was ${f("retailQ")} versus Q1.`, `${f("retailCat")} was the largest category (${f("retailCatShare")} of revenue).`, `${f("retailDec")} products sold less revenue in Q2 than in Q1.`],
    actions: ["Check stock, pricing and promotions for the products that declined before reacting.", "Review whether the largest category is also the most profitable.", "Collect a full year of data to look for seasonality."],
    deliverables: ["Cleaned dataset", "Analysis report (PDF or HTML)", "Executive dashboard"], limits: "Six months cannot show seasonality, and the data cannot explain why products declined." },
  { id: "ecommerce", title: "E-commerce Performance Dashboard", chart: "cs-web", dash: "web",
    context: "An online store wants a single view of traffic and conversion.", problem: "Traffic reports and order reports are separate, so it is unclear which sources convert.",
    data: "Weekly sessions, users and conversions by traffic source and landing page (synthetic).", approach: "Define conversion rate as conversions ÷ sessions, aggregate by source and page, and build filters and a landing-page table.", tools: "Python (pandas), Chart.js",
    findings: [`The sample recorded ${f("webSessions")} sessions with an overall conversion rate of ${f("webRate")}.`, `${f("webTop")} brought the most sessions (${f("webTopShare")} of the total).`, `${f("webBest")} had the highest conversion rate (${f("webBestRate")}).`],
    actions: ["Look at whether the highest-converting source can be scaled before shifting budget.", "Review landing pages with high traffic and low conversion."],
    deliverables: ["Interactive dashboard", "KPI definitions", "CSV export"], limits: "Users are summed weekly and are not unique people. No live analytics integration is implemented in the sample." },
  { id: "quality", title: "Data Cleaning and Quality Improvement", chart: "cs-quality", dash: "quality",
    context: "A business merges order exports from two systems before reporting.", problem: "Duplicate rows, mixed date formats and blank fields make totals unreliable.",
    data: "An order export of about 250 rows with documented injected problems.", approach: "Write explicit rules, standardize safe formatting, remove only exact duplicates, and flag missing or invalid values for a person to decide.", tools: "Python (pandas), JavaScript validation rules",
    findings: [`${f("qRows")} rows were reviewed; ${f("qDup")} exact duplicates were removed and ${f("qFmt")} records had formatting standardized.`, `${f("qMissing")} missing values were detected and left blank.`, `${f("qFlag")} records were flagged for manual review.`, `Completeness moved from ${f("qCompB")} to ${f("qCompA")} only because duplicates left; gaps were not filled.`],
    actions: ["Ask the data owner to confirm negative quantities and fill missing prices from source records.", "Add the validation rules to the monthly import."],
    deliverables: ["Cleaned file", "Quality report", "Summary of changes", "Optional script"], limits: "Cleaning cannot recover information that was never recorded." },
  { id: "inventory", title: "Inventory Monitoring", chart: "cs-inventory", dash: "inventory",
    context: "A shop wants to see stock risks without checking each product.", problem: "Stockouts are noticed when customers ask, and slow products tie up cash.",
    data: "A stock snapshot for 30 products with unit cost, 90-day sales and month-end stock history.", approach: "Compute reorder points, days of cover and stock status, and rank products by distance to a stockout.", tools: "Python (pandas), Chart.js",
    findings: [`${f("invOut")} of ${f("invTotal")} products were out of stock and ${f("invLow")} were at or below their reorder point.`, `Stock on hand was valued at ${f("invValue")} at cost.`, `${f("invNear")} was the closest product to running out.`],
    actions: ["Review reorder quantities for out-of-stock products with strong recent sales.", "Check whether slow movers justify their stock level."],
    deliverables: ["Stock status dashboard", "Reorder list"], limits: "Reorder points rest on a 90-day sales average and assumed lead times; they are not a demand forecast." },
  { id: "finance", title: "Monthly Financial Reporting", chart: "cs-finance", dash: "finance",
    context: "A small business prepares a monthly income and expense summary by hand.", problem: "The result is slow to produce and budget variances are noticed late.",
    data: "Monthly income and expense lines by category with budgets (synthetic).", approach: "Standardize categories, compute income, expenses and a net operating result with stated formulas, and compare with budget.", tools: "Python (pandas), Excel, Chart.js",
    findings: [`Income was ${f("finInc")} and recorded expenses ${f("finExp")}, a net operating result of ${f("finNet")}.`, `The monthly net operating result was negative in ${f("finNeg")} months.`, `${f("finCat")} was the largest expense category (${f("finCatShare")} of the total); total spend was ${f("finBud")}.`],
    actions: ["Discuss the months with a negative result with whoever manages the budget.", "Review the largest cost category for savings that do not harm service."],
    deliverables: ["Monthly financial summary", "Budget variance table"], limits: "Net operating result is not net profit or cash flow, and this is analytical reporting rather than accounting." },
  { id: "education", title: "Student Performance Analysis", chart: "cs-edu", dash: "education",
    context: "A tutoring center wants to see class-level results across assessments.", problem: "Marks are in separate spreadsheets and reports risk exposing individual students.",
    data: "Fictional students with marks and attendance per assessment (pseudonymous IDs, aggregates only).", approach: "Pseudonymize IDs, calculate averages and pass rates by class and subject, and suppress groups under ten results.", tools: "Python (pandas), Chart.js",
    findings: [`${f("eduN")} fictional students were included, with an average mark of ${f("eduAvg")} and a pass rate of ${f("eduPass")}.`, `Highest subject average: ${f("eduTop")}; lowest: ${f("eduLow")}.`, `${f("eduAtt")}. This is an association in sample data, not proof of cause.`],
    actions: ["Offer extra support in the lowest-scoring subject.", "Look at attendance patterns before drawing conclusions."],
    deliverables: ["Class and subject summary", "Assessment trend dashboard"], limits: "Small groups are hidden for privacy, and marks do not capture every aspect of learning." }
];
const li = (a) => `<ul style="margin:0">${a.map((x) => `<li>${x}</li>`).join("")}</ul>`;
const body = pageHero("Case studies", "Six illustrative case studies",
  "These are demonstrations using synthetic or sample data, not real clients. Findings are labelled “Illustrative finding” and every figure is calculated live from the sample datasets. We do not publish invented customers, testimonials or percentage savings.") + `
<section class="section" style="padding-top:36px"><div class="container">
<div class="notice" role="note"><p><strong>Illustrative only.</strong> No real customer, revenue improvement or savings is claimed on this page.</p></div>
<nav aria-label="Case studies" style="margin-top:16px"><ul class="dash-nav">${cases.map((c) => `<li><a href="#${c.id}">${esc(c.title)}</a></li>`).join("")}</ul></nav>
<div class="grid" style="gap:28px;margin-top:8px">${cases.map((c, i) => `
<article class="card case" id="${c.id}" style="padding:28px"><span class="pill teal">Case ${i + 1} · sample data</span><h2 style="font-size:1.5rem;margin-top:8px">${esc(c.title)}</h2>
<dl>
<dt>Business context</dt><dd>${esc(c.context)}</dd><dt>The problem</dt><dd>${esc(c.problem)}</dd><dt>Data available</dt><dd>${esc(c.data)}</dd><dt>Analytical approach</dt><dd>${esc(c.approach)}</dd><dt>Tools used</dt><dd>${esc(c.tools)}</dd>
<dt>Dashboard or report preview</dt><dd data-case-preview><div class="chart-box" style="height:260px"><canvas id="${c.chart}" role="img" aria-label="Chart loading"></canvas></div><p class="chart-summary" data-sum="${c.chart}"></p></dd>
<dt>Illustrative findings</dt><dd>${li(c.findings.map((x) => "<span class=\"small muted\">Illustrative finding:</span> " + x))}</dd>
<dt>Potential business actions</dt><dd>${li(c.actions.map(esc))}</dd><dt>Deliverables</dt><dd>${li(c.deliverables.map(esc))}</dd><dt>Limitations</dt><dd>${esc(c.limits)}</dd>
</dl><div class="btn-row" style="margin-top:18px"><a class="btn btn-secondary btn-sm" href="dashboard.html?id=${c.dash}">Explore the related dashboard</a></div></article>`).join("")}</div></div></section>` + ctaBand("Want a case study from your own data?");
module.exports = [{ file: "case-studies.html", html: page({ file: "case-studies.html", title: "Case Studies (Illustrative Examples)",
  description: "Six illustrative data analytics case studies built on synthetic data: retail sales, e-commerce dashboard, data quality, inventory, monthly financial reporting and student performance.",
  chart: true, scripts: ["js/data-prep.js", "js/cleaning-engine.js", "js/engine.js", "js/dashboards-core.js", "js/dashboards-more.js", "js/case-studies.js"], body }) }];
