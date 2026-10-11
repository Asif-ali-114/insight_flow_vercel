/* Sample analysis report (business-intelligence.html). Scenario: a retailer shares six months (Jan-Jun 2025)
   of sales records. All figures, charts and sentences are computed from the synthetic sales dataset. */
(function () {
  "use strict";
  var U = window.IFU, P = window.IFP, D = window.IFDash, esc = window.IF_ESC;
  var host = document.getElementById("report");
  if (!host) return;
  var PAL = D.PALETTE;

  D.loadData(["sales"]).then(build, function (e) { host.innerHTML = '<div class="error-box" role="alert">The sample data could not be loaded: ' + esc(e.message) + "</div>"; });

  function build() {
    var ctx = P.prepareSales(window.IF_DATA.sales);
    var rows = ctx.rows.filter(function (r) { return r.month <= "2025-06"; });
    var months = ctx.months.filter(function (m) { return m <= "2025-06"; });
    var k = P.salesKpis(rows);
    var monthRev = P.monthlySeries(rows, months, function (r) { return r.revenue; });
    var monthOrders = P.monthlySeries(rows, months, function () { return 1; });
    var monthProfit = P.monthlySeries(rows, months, function (r) { return r.profit || 0; });
    var q1 = months.slice(0, 3), q2 = months.slice(3);
    var q1Rev = U.sum(monthRev.slice(0, 3)), q2Rev = U.sum(monthRev.slice(3));
    var qGrowth = U.pctChange(q2Rev, q1Rev);

    function groupSum(list, key, val) { var m = new Map(); list.forEach(function (r) { m.set(r[key], (m.get(r[key]) || 0) + val(r)); }); return m; }
    var cat = Array.from(groupSum(rows, "category", function (r) { return r.revenue; }).entries()).sort(function (a, b) { return b[1] - a[1]; });
    var prod = Array.from(groupSum(rows, "product", function (r) { return r.revenue; }).entries()).sort(function (a, b) { return b[1] - a[1]; });
    var top5 = prod.slice(0, 5), top5Share = U.sum(top5, function (x) { return x[1]; }) / k.revenue;
    var pq1 = groupSum(rows.filter(function (r) { return q1.indexOf(r.month) !== -1; }), "product", function (r) { return r.revenue; });
    var pq2 = groupSum(rows.filter(function (r) { return q2.indexOf(r.month) !== -1; }), "product", function (r) { return r.revenue; });
    var change = [];
    pq1.forEach(function (v, name) { var c = U.pctChange(pq2.get(name) || 0, v); if (c !== null) change.push({ name: name, q1: v, q2: pq2.get(name) || 0, pct: c }); });
    change.sort(function (a, b) { return a.pct - b.pct; });
    var declining = change.filter(function (c) { return c.pct < 0; });
    var worst = declining.slice(0, 5);
    var hi = monthRev.indexOf(Math.max.apply(null, monthRev)), lo = monthRev.indexOf(Math.min.apply(null, monthRev));
    var seg = P.customerMetrics(rows);
    var catMargin = {};
    cat.forEach(function (c) { var l = rows.filter(function (r) { return r.category === c[0]; }); catMargin[c[0]] = P.salesKpis(l).margin; });
    var minCat = Object.keys(catMargin).sort(function (a, b) { return catMargin[a] - catMargin[b]; })[0];
    var ml = function (m) { return U.monthLabel(m, true); };

    var kpiHtml = [["Revenue", U.money(k.revenue), "Jan–Jun 2025"], ["Orders", U.int(k.orders), "Average order " + U.money(k.aov)], ["Gross profit", U.money(k.profit), "Revenue − cost of goods sold"], ["Gross margin", U.pct(k.margin), "Gross profit ÷ revenue"], ["Q2 vs Q1 revenue", U.signedPct(qGrowth), U.money(q2Rev) + " vs " + U.money(q1Rev)]]
      .map(function (x) { return '<div class="kpi"><div class="label">' + esc(x[0]) + '</div><div class="value">' + esc(x[1]) + '</div><div class="sub">' + esc(x[2]) + "</div></div>"; }).join("");

    var obs = [
      "Monthly revenue ranged from " + U.money(monthRev[lo]) + " (" + ml(months[lo]) + ") to " + U.money(monthRev[hi]) + " (" + ml(months[hi]) + "). Second-quarter revenue was " + U.signedPct(qGrowth) + " versus the first quarter, while orders went from " + U.int(U.sum(monthOrders.slice(0, 3))) + " to " + U.int(U.sum(monthOrders.slice(3))) + ".",
      cat[0][0] + " was the largest category at " + U.money(cat[0][1]) + " (" + U.pct(cat[0][1] / k.revenue) + " of revenue). The five best-selling products together made up " + U.pct(top5Share) + " of revenue.",
      declining.length + " of " + change.length + " products sold less revenue in Q2 than in Q1. The steepest declines were " + worst.slice(0, 3).map(function (c) { return c.name + " (" + U.signedPct(c.pct, 0) + ")"; }).join(", ") + ".",
      "Gross margin by category was lowest for " + minCat + " (" + U.pct(catMargin[minCat]) + "), which means revenue rankings and profit rankings are not identical.",
      U.int(seg.unique) + " distinct (synthetic) customers placed orders; each placed " + U.dec1(rows.length / seg.unique) + " orders on average in the period."
    ];

    var sections = [
      ["Executive summary", "<p>For the six months January–June 2025, this sample retailer recorded <strong>" + U.money(k.revenue) + "</strong> in revenue across <strong>" + U.int(k.orders) + "</strong> orders, with a gross margin of <strong>" + U.pct(k.margin) + "</strong>. Revenue rose through the second quarter (" + U.signedPct(qGrowth) + " versus Q1), but " + declining.length + " products sold less in Q2 than in Q1. These are observed patterns, and the data alone cannot say why they occurred.</p>"],
      ["Business question", "<p>Which products and categories drive revenue and gross profit, how did performance change between the first and second quarter, and which products deserve a closer look because their sales are falling?</p>"],
      ["Dataset overview", "<p>" + U.int(k.orders) + " order lines, 30 products in 6 categories, 4 regions, " + U.int(seg.unique) + " customer IDs, " + ml(months[0]) + " to " + ml(months[months.length - 1]) + ". Revenue is quantity × list price × (1 − discount). Source: the synthetic sample sales dataset (<a href=\"data/sales.csv\" download>download CSV</a>).</p>"],
      ["Data quality findings", "<p>Order lines with an unknown unit cost: <strong>" + U.int(k.uncostedRows) + "</strong> of " + U.int(k.orders) + ". " + (k.uncostedRows ? "These are excluded from margin figures." : "Every line has cost data, so margin figures cover all orders.") + " No duplicate order IDs or missing quantities were found in this clean sample. A real client file usually needs the cleaning steps shown on the <a href=\"data-cleaning.html\">data cleaning page</a> before analysis.</p>"],
      ["Methodology", "<ul><li>Revenue, orders and gross profit are summed from order lines. Gross profit = revenue − cost of goods sold; operating costs are not included.</li><li>Average order value = revenue ÷ orders. Gross margin = gross profit ÷ revenue.</li><li>Quarter comparison: Q1 = Jan–Mar, Q2 = Apr–Jun. Product change = (Q2 − Q1) ÷ Q1 revenue; products with zero Q1 revenue are excluded rather than shown as infinite growth.</li></ul>"]
    ];

    var recs = [
      "Check whether the largest product declines (" + worst.slice(0, 3).map(function (c) { return c.name; }).join(", ") + ") reflect stock availability, pricing, discounting or demand before changing anything.",
      "Review the discount policy for " + minCat + ", the lowest-margin category, to see whether lower margins are intended.",
      "Because the top five products carry " + U.pct(top5Share) + " of revenue, confirm that stock of those products is monitored closely.",
      "Request a second year of data to separate seasonal patterns from genuine trend changes."
    ];
    var next = ["Agree which KPIs the business wants tracked every month.", "Add stock-on-hand and promotion records to test the possible explanations above.", "Turn this report into a recurring monthly report or an interactive dashboard."];
    var limits = ["Six months cannot show a seasonal pattern, only a first-half trend.", "Sales records alone do not explain customer motivation, competitor activity or stock-outs.", "Quarter-to-quarter changes in small products can reflect only a few orders.", "Gross profit excludes payroll, rent, marketing and other operating costs. This is analytical reporting, not accounting advice."];

    host.innerHTML =
      '<div class="report" id="report-doc"><span class="pill teal">Sample report · synthetic data</span><h2 class="report-title" style="margin-top:10px">H1 2025 Sales Performance Report</h2>' +
      '<p class="meta">Prepared for: a fictional retailer (sample) · Period: January–June 2025 · Illustrative report; not real client work</p>' +
      sections.slice(0, 1).map(sec).join("") + sections.slice(1, 4).map(sec).join("") + sec(sections[4]) +
      "<h3>Key performance indicators</h3><div class=\"kpis\">" + kpiHtml + "</div>" +
      "<h3>Visualizations</h3>" +
      '<div class="chart-grid">' +
      chartCard("rc-month", "Monthly revenue and gross profit", "Revenue and gross profit per month.", "Revenue was highest in " + ml(months[hi]) + " and lowest in " + ml(months[lo]) + ".") +
      chartCard("rc-cat", "Revenue by category", "Share of six-month revenue.", cat[0][0] + " is the largest category (" + U.pct(cat[0][1] / k.revenue) + ").") +
      chartCard("rc-top", "Top 5 products by revenue", "Six-month revenue.", top5[0][0] + " leads with " + U.money(top5[0][1]) + ".") +
      chartCard("rc-decl", "Products with falling sales (Q2 vs Q1)", "Percentage change in revenue, five steepest declines.", worst.length ? worst[0].name + " fell the most (" + U.signedPct(worst[0].pct) + ")." : "No product declined.") +
      "</div>" +
      "<h3>Major observations</h3><ol>" + obs.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ol>" +
      "<h3>Limitations and assumptions</h3><ul>" + limits.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ul>" +
      "<h3>Practical recommendations</h3><ol>" + recs.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ol>" +
      "<h3>Suggested next steps</h3><ul>" + next.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ul></div>";

    function sec(s) { return "<h3>" + esc(s[0]) + "</h3>" + s[1]; }
    function chartCard(id, title, desc, sum) {
      return '<section class="chart-card" aria-labelledby="' + id + '-t"><h3 id="' + id + '-t">' + esc(title) + '</h3><p class="chart-desc">' + esc(desc) + '</p><div class="chart-box"><canvas id="' + id + '" role="img" aria-label="' + esc(title + ". " + sum) + '"></canvas></div><p class="chart-summary">' + esc(sum) + "</p></section>";
    }
    var moneyOpts = { scales: { y: { ticks: { callback: D.moneyTick } } }, plugins: { tooltip: { callbacks: { label: D.tipMoney } } } };
    var common = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, color: D.INK } }, tooltip: { backgroundColor: D.NAVY, padding: 10 } } };
    function draw(id, cfg) { cfg.options = Object.assign({}, common, cfg.options || {}); cfg.options.plugins = Object.assign({}, common.plugins, (cfg.options.plugins || {})); new Chart(document.getElementById(id), cfg); }
    var gridY = { grid: { color: D.GRID }, border: { display: false }, ticks: { color: D.INK } }, gridX = { grid: { display: false }, ticks: { color: D.INK } };
    draw("rc-month", { type: "bar", data: { labels: months.map(function (m) { return U.monthLabel(m); }), datasets: [{ label: "Revenue", data: monthRev, backgroundColor: PAL[0], borderRadius: 4 }, { label: "Gross profit", data: monthProfit, backgroundColor: PAL[2], borderRadius: 4 }] },
      options: { scales: { x: gridX, y: Object.assign({ beginAtZero: true }, gridY, { ticks: { color: D.INK, callback: D.moneyTick } }) }, plugins: { tooltip: { callbacks: { label: D.tipMoney } } } } });
    draw("rc-cat", { type: "doughnut", data: { labels: cat.map(function (c) { return c[0]; }), datasets: [{ data: cat.map(function (c) { return c[1]; }), backgroundColor: cat.map(function (c) { return D.CAT_COLORS[c[0]]; }), borderColor: "#fff", borderWidth: 2 }] }, options: { cutout: "60%", plugins: { tooltip: { callbacks: { label: function (c) { return " " + c.label + ": " + U.money(c.parsed) + " (" + U.pct(c.parsed / k.revenue) + ")"; } } } } } });
    draw("rc-top", { type: "bar", data: { labels: top5.map(function (x) { return x[0]; }), datasets: [{ label: "Revenue", data: top5.map(function (x) { return x[1]; }), backgroundColor: PAL[0], borderRadius: 4 }] }, options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: D.tipMoney } } }, scales: { x: Object.assign({ beginAtZero: true }, gridY, { ticks: { color: D.INK, callback: D.moneyTick } }), y: gridX } } });
    draw("rc-decl", { type: "bar", data: { labels: worst.map(function (c) { return c.name; }), datasets: [{ label: "Change in revenue, Q2 vs Q1", data: worst.map(function (c) { return c.pct; }), backgroundColor: PAL[1], borderRadius: 4 }] }, options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return " " + U.signedPct(c.parsed.x); } } } }, scales: { x: Object.assign({}, gridY, { ticks: { color: D.INK, callback: function (v) { return U.pct(v, 0); } } }), y: gridX } } });

    /* downloads: only real, working actions */
    document.querySelector('[data-act="report-csv"]').addEventListener("click", function () {
      var out = months.map(function (m, i) { return { section: "Monthly", item: ml(m), revenue: U.round2(monthRev[i]), orders: monthOrders[i], gross_profit: U.round2(monthProfit[i]) }; });
      cat.forEach(function (c) { out.push({ section: "Category revenue", item: c[0], revenue: U.round2(c[1]), orders: "", gross_profit: "" }); });
      change.slice(0, 10).forEach(function (c) { out.push({ section: "Q2 vs Q1 revenue change", item: c.name, revenue: U.round2(c.q2), orders: "", gross_profit: U.round2(c.pct * 100) + "% (Q1 " + U.round2(c.q1) + ")" }); });
      U.downloadText("sample-report-data.csv", U.toCsv([{ key: "section", label: "Section" }, { key: "item", label: "Item" }, { key: "revenue", label: "Revenue (USD)" }, { key: "orders", label: "Orders" }, { key: "gross_profit", label: "Gross profit (USD) / note" }], out));
    });
    document.querySelector('[data-act="report-print"]').addEventListener("click", function () { window.print(); });
    host.__report = { revenue: k.revenue, orders: k.orders, monthRev: monthRev, declining: declining.length };
  }
})();
