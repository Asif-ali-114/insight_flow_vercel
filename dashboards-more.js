/* Dashboard definitions 5-12 (inventory, finance, marketing, education, data quality, monthly reporting, web, operations). */
(function () {
  "use strict";
  var U = window.IFU, P = window.IFP, D = window.IFDash, H = window.IFDH, C = window.IFClean;
  var PAL = D.PALETTE, CAT = D.CAT_COLORS;
  var money = U.money, pct = U.pct, ml = H.ml, byKey = H.byKey, sortedEntries = H.sortedEntries, peak = H.peak;
  var pctTick = function (v) { return pct(v, 0); };
  var intTip = { plugins: { tooltip: { callbacks: { label: function (c) { return " " + c.dataset.label + ": " + U.int(c.parsed.y !== undefined && c.chart.options.indexAxis !== "y" ? c.parsed.y : c.parsed.x); } } } } };
  function monthsIn(ctx, st) { return ctx.months.filter(function (m) { return m >= st.month.from && m <= st.month.to; }); }
  function status(label, cls) { return '<span class="pill ' + cls + '">' + label + "</span>"; }

  /* ======================= 5. Inventory ======================= */
  window.IF_DASHBOARDS.push({
    id: "inventory", order: 5, title: "Inventory and Stock Monitoring", icon: "box", data: ["inventory"], csv: "inventory",
    blurb: "Low-stock and out-of-stock alerts, stock value and fast or slow movers.",
    tags: ["Stock", "Reorder", "Velocity"],
    purpose: "Identify the products that need inventory attention now and the ones that tie up cash.",
    problem: "Stockouts lose sales while overstock ties up money, and neither is visible in a plain spreadsheet of counts.",
    learn: ["Which products are at or below their reorder point", "How much cost value sits in stock", "Which products move fast and which move slowly"],
    sampleNote: "This dashboard uses a synthetic inventory snapshot (30 products, as of 31 Dec 2025) with 12 months of month-end stock history. It is not connected to any warehouse or inventory system.",
    definitions: ["Out of stock = 0 units on hand. Low stock = 1 unit up to the reorder point. In stock = above the reorder point.", "Reorder point = average daily units sold over the last 90 days × (supplier lead days + 7 safety days), minimum 5 units.", "Inventory value = units on hand × unit cost.", "Fast / slow movers = top / bottom third of products by units sold in the last 90 days.", "Forecasting future demand needs suitable history and assumptions; these figures describe the current position only."],
    prepare: function (raw) {
      var d = raw.inventory, items = d.items.map(function (i) {
        var st = i.stock === 0 ? "Out of stock" : i.stock <= i.reorderPoint ? "Low stock" : "In stock", daily = i.units90 / 90;
        return { sku: i.sku, product: i.product, category: i.category, stock: i.stock, reorderPoint: i.reorderPoint, unitCost: i.unitCost, status: st, value: i.stock * i.unitCost, units90: i.units90, history: i.history, cover: daily > 0 ? i.stock / daily : null, ratio: i.stock / i.reorderPoint, tier: "Medium" };
      });
      var sorted = items.slice().sort(function (a, b) { return b.units90 - a.units90; }), n = Math.floor(items.length / 3);
      sorted.forEach(function (r, i) { r.tier = i < n ? "Fast" : i >= items.length - n ? "Slow" : "Medium"; });
      return { rows: items, months: d.months, categories: U.sortedUniq(items.map(function (r) { return r.category; })), asOf: d.asOf };
    },
    filters: [
      { id: "category", type: "select", field: "category", label: "Category", options: function (c) { return c.categories; } },
      { id: "status", type: "select", field: "status", label: "Stock status", options: ["Out of stock", "Low stock", "In stock"] },
      { id: "q", type: "text", label: "Search product or SKU", fields: ["product", "sku"], placeholder: "e.g. keyboard or SKU-012" }
    ],
    kpis: function (rows) {
      return [
        { label: "Products in Stock", value: U.int(rows.filter(function (r) { return r.stock > 0; }).length), sub: "of " + U.int(rows.length) + " products in view" },
        { label: "Low-Stock Items", value: U.int(rows.filter(function (r) { return r.status === "Low stock"; }).length), sub: "At or below reorder point" },
        { label: "Out-of-Stock Items", value: U.int(rows.filter(function (r) { return r.status === "Out of stock"; }).length), sub: "Zero units on hand" },
        { label: "Total Inventory Value", value: money(U.sum(rows, function (r) { return r.value; })), sub: "Units on hand × unit cost" }
      ];
    },
    charts: [
      { id: "bycat", title: "Units in stock by category", desc: "Units on hand.", crossFilter: { filter: "category" }, config: function (rows) {
          var e = sortedEntries(byKey(rows, function (r) { return r.category; }, function (r) { return r.stock; }), true);
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Units on hand", data: e.map(function (x) { return x[1]; }), backgroundColor: H.catColors(e.map(function (x) { return x[0]; })) }] }, options: intTip };
        }, summary: function (rows) { var e = sortedEntries(byKey(rows, function (r) { return r.category; }, function (r) { return r.stock; }), true); return e[0][0] + " holds the most units (" + U.int(e[0][1]) + ")."; }, valueFmt: U.int },
      { id: "reorder", title: "Stock versus reorder threshold", desc: "The 10 products closest to (or below) their reorder point.", tall: true, config: function (rows) {
          var l = rows.slice().sort(function (a, b) { return a.ratio - b.ratio; }).slice(0, 10);
          return { type: "bar", data: { labels: l.map(function (r) { return r.product; }), datasets: [{ label: "Units on hand", data: l.map(function (r) { return r.stock; }), backgroundColor: PAL[0] }, { label: "Reorder point", data: l.map(function (r) { return r.reorderPoint; }), backgroundColor: PAL[1] }] }, options: Object.assign({ indexAxis: "y" }, intTip) };
        }, summary: function (rows) { var l = rows.slice().sort(function (a, b) { return a.ratio - b.ratio; }); return l[0].product + " is the closest to a stockout (" + l[0].stock + " on hand vs reorder point " + l[0].reorderPoint + ")."; }, valueFmt: U.int },
      { id: "movers", title: "Fast and slow movers", desc: "Units sold in the last 90 days: top third and bottom third of products in view.", tall: true, config: function (rows) {
          var l = rows.slice().sort(function (a, b) { return b.units90 - a.units90; }), n = Math.max(1, Math.floor(l.length / 3));
          var pick = l.filter(function (r) { return r.tier !== "Medium"; }).slice(0, 14);
          if (!pick.length) pick = l.slice(0, Math.min(l.length, n));
          return { type: "bar", data: { labels: pick.map(function (r) { return r.product; }), datasets: [{ label: "Fast-moving", data: pick.map(function (r) { return r.tier === "Fast" ? r.units90 : null; }), backgroundColor: PAL[0] }, { label: "Slow-moving", data: pick.map(function (r) { return r.tier === "Slow" ? r.units90 : null; }), backgroundColor: PAL[1] }] }, options: Object.assign({ indexAxis: "y", scales: { x: { stacked: true }, y: { stacked: true } } }, intTip) };
        }, summary: function (rows) { var l = rows.slice().sort(function (a, b) { return b.units90 - a.units90; }); return "Fastest: " + l[0].product + " (" + U.int(l[0].units90) + " units); slowest: " + l[l.length - 1].product + " (" + U.int(l[l.length - 1].units90) + " units)."; },
        tableData: function (rows) { var l = rows.slice().sort(function (a, b) { return b.units90 - a.units90; }); return { headers: ["Product", "Units sold (90 days)", "Movement"], rows: l.map(function (r) { return [r.product, U.int(r.units90), r.tier]; }) }; } },
      { id: "trend", title: "Units on hand over time", desc: "Month-end units on hand for products in view (2025).", config: function (rows, ctx) {
          var vals = ctx.months.map(function (m, i) { return U.sum(rows, function (r) { return r.history[i]; }); });
          return { type: "line", data: { labels: ctx.months.map(ml), datasets: [{ label: "Units on hand", data: vals, borderColor: PAL[0], backgroundColor: "rgba(42,120,214,.12)", fill: true }] }, options: intTip };
        }, summary: function (rows, ctx) { var vals = ctx.months.map(function (m, i) { return U.sum(rows, function (r) { return r.history[i]; }); }); return peak(ctx.months.map(ml), vals, U.int, "units on hand"); }, valueFmt: U.int }
    ],
    table: {
      title: "Products", pageSize: 10, sort: { key: "ratio", dir: "asc" },
      columns: [{ key: "sku", label: "SKU" }, { key: "product", label: "Product" }, { key: "category", label: "Category" },
        { key: "status", label: "Status", html: true, fmt: function (v) { return status(v, v === "Out of stock" ? "bad" : v === "Low stock" ? "warn" : "ok"); } },
        { key: "stock", label: "On hand", num: true }, { key: "reorderPoint", label: "Reorder point", num: true },
        { key: "cover", label: "Days of cover", num: true, fmt: function (v) { return v === null ? "n/a" : U.int(v); } },
        { key: "units90", label: "Sold (90d)", num: true }, { key: "value", label: "Value", num: true, fmt: money }],
      rows: function (rows) { return rows.map(function (r) { return Object.assign({}, r); }); }
    },
    export: { columns: [["sku", "SKU"], ["product", "Product"], ["category", "Category"], ["status", "Status"], ["stock", "Units on hand"], ["reorderPoint", "Reorder point"], ["units90", "Units sold (90 days)"], ["unitCost", "Unit cost"], ["value", "Inventory value"]].map(function (c) { return { key: c[0], label: c[1] }; }), rows: function (rows) { return rows; } }
  });

  /* ======================= 6. Financial and Expense Overview ======================= */
  var EXPCOL = { "Cost of Goods Sold": PAL[0], Payroll: PAL[1], Rent: PAL[2], Marketing: PAL[3], "Software & Tools": PAL[4], Utilities: PAL[5], Shipping: PAL[6] };
  window.IF_DASHBOARDS.push({
    id: "finance", order: 6, title: "Financial and Expense Overview", icon: "wallet", data: ["expenses"], csv: "expenses",
    blurb: "Income versus expenses, expense categories and budget versus actual.",
    tags: ["Expenses", "Budget", "Net result"],
    purpose: "Show where money comes in and where it goes each month, and how actual spending compares with budget.",
    problem: "Small businesses often track income and costs in separate sheets, so the monthly result and cost drivers are slow to see.",
    learn: ["Whether monthly income covered recorded expenses", "Which expense categories are the largest and most volatile", "Where actual spending ran above or below budget"],
    sampleNote: "This is simplified analytical reporting on a synthetic dataset. It is not accounting, an audit, tax advice or a substitute for proper financial statements. Income equals the sales revenue in the sample sales dataset.",
    definitions: ["Total Income = sales revenue for the selected months (accrual-style, not cash received).", "Total Expenses = all recorded expense categories, including cost of goods sold.", "Net Operating Result = Total Income − Total Expenses. It is not net profit (no tax, interest or depreciation), not cash flow and not a gross margin. It is shown only when all expense categories are selected, because a single category cannot be netted against total income.", "Expense Change = total expenses in the last selected month versus the month before. Needs two months in range.", "Variance = actual − budget (positive = over budget)."],
    prepare: function (raw) {
      var d = raw.expenses, rows = d.rows.map(function (r) { return { month: r[0], category: r[1], budget: r[2], actual: r[3] }; });
      var inc = new Map(); d.income.forEach(function (r) { inc.set(r[0], r[1]); });
      return { rows: rows, income: inc, months: U.sortedUniq(rows.map(function (r) { return r.month; })), categories: d.categories };
    },
    filters: [{ id: "month", type: "month", label: "Months" }, { id: "category", type: "select", field: "category", label: "Expense category", options: function (c) { return c.categories; } }],
    kpis: function (rows, ctx, st) {
      var ms = monthsIn(ctx, st), income = U.sum(ms, function (m) { return ctx.income.get(m) || 0; }), exp = U.sum(rows, function (r) { return r.actual; });
      var all = st.category === "All", mm = byKey(rows, function (r) { return r.month; }, function (r) { return r.actual; });
      var chg = ms.length >= 2 ? U.pctChange(mm.get(ms[ms.length - 1]) || 0, mm.get(ms[ms.length - 2]) || 0) : null;
      var net = income - exp;
      return [
        { label: "Total Income", value: money(income), sub: "Sales revenue, " + ms.length + " month(s)" }, { label: "Total Expenses", value: money(exp), sub: all ? "All categories" : st.category + " only" },
        { label: "Net Operating Result", value: all ? money(net) : "n/a", sub: all ? (net >= 0 ? "Income exceeds expenses" : "Expenses exceed income") : "Select all categories to net against income" },
        { label: "Expense Change", value: chg === null ? "n/a" : U.signedPct(chg), sub: "Last month vs previous month", delta: chg, neutral: true, deltaNA: "Needs two months with a non-zero baseline" }
      ];
    },
    charts: [
      { id: "inex", title: "Monthly income and expenses", desc: "Income is shown when all categories are selected.", wide: true, config: function (rows, ctx, st) {
          var ms = monthsIn(ctx, st), ex = byKey(rows, function (r) { return r.month; }, function (r) { return r.actual; });
          var ds = []; if (st.category === "All") ds.push({ label: "Income", data: ms.map(function (m) { return ctx.income.get(m) || 0; }), backgroundColor: PAL[0] });
          ds.push({ label: "Expenses", data: ms.map(function (m) { return ex.get(m) || 0; }), backgroundColor: PAL[1] });
          return { type: "bar", data: { labels: ms.map(ml), datasets: ds }, options: H.moneyY };
        }, summary: function (rows, ctx, st) { var ms = monthsIn(ctx, st), ex = byKey(rows, function (r) { return r.month; }, function (r) { return r.actual; }); return peak(ms.map(ml), ms.map(function (m) { return ex.get(m) || 0; }), money, "expenses"); }, valueFmt: money },
      { id: "bycat", title: "Expenses by category", desc: "Total actual spend per category.", crossFilter: { filter: "category" }, config: function (rows) {
          var e = sortedEntries(byKey(rows, function (r) { return r.category; }, function (r) { return r.actual; }), true);
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Expenses", data: e.map(function (x) { return x[1]; }), backgroundColor: e.map(function (x) { return EXPCOL[x[0]]; }) }] }, options: H.moneyX };
        }, summary: function (rows) { var e = sortedEntries(byKey(rows, function (r) { return r.category; }, function (r) { return r.actual; }), true), t = U.sum(e, function (x) { return x[1]; }); return e[0][0] + " is the largest expense (" + money(e[0][1]) + ", " + pct(e[0][1] / t) + " of the total)."; }, valueFmt: money },
      { id: "bva", title: "Budget versus actual", desc: "Budget and actual spend per category.", config: function (rows) {
          var cats = U.sortedUniq(rows.map(function (r) { return r.category; })), b = byKey(rows, function (r) { return r.category; }, function (r) { return r.budget; }), a = byKey(rows, function (r) { return r.category; }, function (r) { return r.actual; });
          return { type: "bar", data: { labels: cats, datasets: [{ label: "Budget", data: cats.map(function (c) { return b.get(c); }), backgroundColor: PAL[0] }, { label: "Actual", data: cats.map(function (c) { return a.get(c); }), backgroundColor: PAL[1] }] }, options: H.moneyY };
        }, summary: function (rows) { var tb = U.sum(rows, function (r) { return r.budget; }), ta = U.sum(rows, function (r) { return r.actual; }); return "Total actual " + money(ta) + " versus budget " + money(tb) + " (" + (ta > tb ? "over" : "under") + " budget by " + money(Math.abs(ta - tb)) + ")."; }, valueFmt: money },
      { id: "mix", title: "Expense trend by category", desc: "Monthly expenses, stacked by category.", wide: true, tall: true, config: function (rows, ctx, st) {
          var ms = monthsIn(ctx, st), cats = ctx.categories.filter(function (c) { return rows.some(function (r) { return r.category === c; }); });
          return { type: "bar", data: { labels: ms.map(ml), datasets: cats.map(function (c) { var m = byKey(rows.filter(function (r) { return r.category === c; }), function (r) { return r.month; }, function (r) { return r.actual; }); return { label: c, data: ms.map(function (k) { return m.get(k) || 0; }), backgroundColor: EXPCOL[c], borderColor: "#fff", borderWidth: 1 }; }) }, options: Object.assign({}, H.moneyY, { scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: D.moneyTick } } } }) };
        }, summary: function (rows, ctx, st) { var ms = monthsIn(ctx, st), ex = byKey(rows, function (r) { return r.month; }, function (r) { return r.actual; }); return peak(ms.map(ml), ms.map(function (m) { return ex.get(m) || 0; }), money, "monthly expenses"); }, valueFmt: money }
    ],
    table: {
      title: "Expense lines: budget versus actual", pageSize: 10, sort: { key: "month", dir: "desc" },
      columns: [{ key: "month", label: "Month" }, { key: "category", label: "Category" }, { key: "budget", label: "Budget", num: true, fmt: money }, { key: "actual", label: "Actual", num: true, fmt: money },
        { key: "variance", label: "Variance", num: true, fmt: function (v) { return (v > 0 ? "+" : "") + money(v); } }, { key: "variancePct", label: "Variance %", num: true, fmt: function (v) { return v === null ? "n/a" : U.signedPct(v); } },
        { key: "flag", label: "Against budget" }],
      rows: function (rows) { return rows.map(function (r) { var v = r.actual - r.budget; return { month: r.month, category: r.category, budget: r.budget, actual: r.actual, variance: v, variancePct: U.pctChange(r.actual, r.budget), flag: v > 0 ? "Over budget" : v < 0 ? "Under budget" : "On budget" }; }); }
    }
  });

  /* ======================= 7. Marketing Performance ======================= */
  function campaigns(rows) {
    var g = U.groupBy(rows, function (r) { return r.campaign; }), out = [];
    g.forEach(function (l, name) {
      var s = U.sum(l, function (r) { return r.spend; }), im = U.sum(l, function (r) { return r.impressions; }), cl = U.sum(l, function (r) { return r.clicks; }), cv = U.sum(l, function (r) { return r.conversions; });
      out.push({ campaign: name, channel: l[0].channel, spend: s, impressions: im, clicks: cl, conversions: cv, ctr: U.div(cl, im), cpc: U.div(s, cl), cvr: U.div(cv, cl), cpa: U.div(s, cv) });
    });
    return out;
  }
  window.IF_DASHBOARDS.push({
    id: "marketing", order: 7, title: "Marketing Performance", icon: "megaphone", data: ["marketing"], csv: "marketing",
    blurb: "Spend, clicks and conversions by campaign, with every formula shown.",
    tags: ["Campaigns", "CTR", "Cost per conversion"],
    purpose: "Compare campaigns on cost and results using the metrics a marketing export normally contains.",
    problem: "Spend and results sit in different platform reports, so it is hard to see which campaigns earn their budget.",
    learn: ["Which campaigns convert at the lowest cost", "How click-through rate differs by channel", "How spend and conversions moved month by month"],
    sampleNote: "This dashboard uses internally consistent synthetic campaign data. It is not connected to Google Ads, Meta Ads or any other platform, and its conversions are not reconciled to the sales dataset.",
    definitions: ["Click-through rate (CTR) = clicks ÷ impressions.", "Cost per click (CPC) = spend ÷ clicks.", "Conversion rate = conversions ÷ clicks (the denominator is clicks, not impressions).", "Cost per conversion = spend ÷ conversions; shown as n/a when a campaign has no conversions."],
    prepare: function (raw) {
      var d = raw.marketing, rows = d.rows.map(function (r) { return { month: r[0], campaign: r[1], channel: r[2], spend: r[3], impressions: r[4], clicks: r[5], conversions: r[6] }; });
      return { rows: rows, months: U.sortedUniq(rows.map(function (r) { return r.month; })), channels: U.sortedUniq(rows.map(function (r) { return r.channel; })), campaigns: U.sortedUniq(rows.map(function (r) { return r.campaign; })) };
    },
    filters: [{ id: "month", type: "month", label: "Months" }, { id: "channel", type: "select", field: "channel", label: "Channel", options: function (c) { return c.channels; } }, { id: "campaign", type: "select", field: "campaign", label: "Campaign", options: function (c) { return c.campaigns; } }],
    kpis: function (rows) {
      var s = U.sum(rows, function (r) { return r.spend; }), im = U.sum(rows, function (r) { return r.impressions; }), cl = U.sum(rows, function (r) { return r.clicks; }), cv = U.sum(rows, function (r) { return r.conversions; });
      return [
        { label: "Campaign Spend", value: money(s) }, { label: "Impressions", value: U.int(im) }, { label: "Clicks", value: U.int(cl), sub: "CTR " + pct(U.div(cl, im), 2) },
        { label: "Conversions", value: U.int(cv), sub: "Cost per conversion " + (cv ? U.money2(s / cv) : "n/a") },
        { label: "Cost per Click", value: cl ? U.money2(s / cl) : "n/a", sub: "Spend ÷ clicks" }, { label: "Conversion Rate", value: pct(U.div(cv, cl), 2), sub: "Conversions ÷ clicks" }
      ];
    },
    charts: [
      { id: "scatter", title: "Spend versus conversions", desc: "Each point is a campaign: spend (x) against conversions (y).", config: function (rows) {
          var c = campaigns(rows);
          return { type: "scatter", data: { datasets: [{ label: "Campaigns", data: c.map(function (x) { return { x: x.spend, y: x.conversions, name: x.campaign }; }), backgroundColor: PAL[0], borderColor: "#fff", borderWidth: 2, pointRadius: 7, pointHoverRadius: 9 }] },
            options: { interaction: { mode: "nearest", intersect: true }, scales: { x: { type: "linear", beginAtZero: true, title: { display: true, text: "Spend ($)" }, ticks: { callback: D.moneyTick } }, y: { beginAtZero: true, title: { display: true, text: "Conversions" } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { var d = c.raw; return " " + d.name + ": " + money(d.x) + " spend, " + U.int(d.y) + " conversions"; } } } } } };
        }, summary: function (rows) { var c = campaigns(rows).sort(function (a, b) { return b.conversions - a.conversions; }); return c[0].campaign + " has the most conversions (" + U.int(c[0].conversions) + " from " + money(c[0].spend) + ")."; },
        tableData: function (rows) { return { headers: ["Campaign", "Spend", "Conversions"], rows: campaigns(rows).map(function (c) { return [c.campaign, money(c.spend), U.int(c.conversions)]; }) }; } },
      { id: "ctr", title: "Click-through rate by campaign", desc: "Clicks ÷ impressions.", config: function (rows) {
          var c = campaigns(rows).sort(function (a, b) { return b.ctr - a.ctr; });
          return { type: "bar", data: { labels: c.map(function (x) { return x.campaign; }), datasets: [{ label: "CTR", data: c.map(function (x) { return x.ctr; }), backgroundColor: PAL[2] }] }, options: { indexAxis: "y", scales: { x: { ticks: { callback: function (v) { return pct(v, 1); } } } }, plugins: { tooltip: { callbacks: { label: function (c2) { return " CTR: " + pct(c2.parsed.x, 2); } } } } } };
        }, summary: function (rows) { var c = campaigns(rows).sort(function (a, b) { return b.ctr - a.ctr; }); return c[0].campaign + " has the highest CTR (" + pct(c[0].ctr, 2) + ")."; }, valueFmt: function (v) { return pct(v, 2); } },
      { id: "cpa", title: "Cost per conversion by campaign", desc: "Spend ÷ conversions (campaigns with conversions only).", config: function (rows) {
          var c = campaigns(rows).filter(function (x) { return x.cpa !== null; }).sort(function (a, b) { return a.cpa - b.cpa; });
          return { type: "bar", data: { labels: c.map(function (x) { return x.campaign; }), datasets: [{ label: "Cost per conversion", data: c.map(function (x) { return x.cpa; }), backgroundColor: PAL[1] }] }, options: { indexAxis: "y", scales: { x: { ticks: { callback: function (v) { return "$" + v; } } } }, plugins: { tooltip: { callbacks: { label: function (c2) { return " " + U.money2(c2.parsed.x) + " per conversion"; } } } } } };
        }, summary: function (rows) { var c = campaigns(rows).filter(function (x) { return x.cpa !== null; }).sort(function (a, b) { return a.cpa - b.cpa; }); return c.length ? c[0].campaign + " is the cheapest per conversion (" + U.money2(c[0].cpa) + ")." : "No conversions in this selection."; }, valueFmt: function (v) { return U.money2(v); } },
      { id: "mspend", title: "Monthly spend", desc: "Total campaign spend per month.", config: function (rows, ctx, st) {
          var ms = monthsIn(ctx, st), m = byKey(rows, function (r) { return r.month; }, function (r) { return r.spend; });
          return { type: "bar", data: { labels: ms.map(ml), datasets: [{ label: "Spend", data: ms.map(function (k) { return m.get(k) || 0; }), backgroundColor: PAL[0] }] }, options: H.moneyY };
        }, summary: function (rows, ctx, st) { var ms = monthsIn(ctx, st), m = byKey(rows, function (r) { return r.month; }, function (r) { return r.spend; }); return peak(ms.map(ml), ms.map(function (k) { return m.get(k) || 0; }), money, "spend"); }, valueFmt: money },
      { id: "mconv", title: "Monthly conversions", desc: "Total conversions per month.", config: function (rows, ctx, st) {
          var ms = monthsIn(ctx, st), m = byKey(rows, function (r) { return r.month; }, function (r) { return r.conversions; });
          return { type: "line", data: { labels: ms.map(ml), datasets: [{ label: "Conversions", data: ms.map(function (k) { return m.get(k) || 0; }), borderColor: PAL[2], backgroundColor: PAL[2] }] }, options: intTip };
        }, summary: function (rows, ctx, st) { var ms = monthsIn(ctx, st), m = byKey(rows, function (r) { return r.month; }, function (r) { return r.conversions; }); return peak(ms.map(ml), ms.map(function (k) { return m.get(k) || 0; }), U.int, "conversions"); }, valueFmt: U.int }
    ],
    table: {
      title: "Campaign performance", pageSize: 10, sort: { key: "spend", dir: "desc" },
      columns: [{ key: "campaign", label: "Campaign" }, { key: "channel", label: "Channel" }, { key: "spend", label: "Spend", num: true, fmt: money }, { key: "impressions", label: "Impressions", num: true, fmt: U.int }, { key: "clicks", label: "Clicks", num: true, fmt: U.int },
        { key: "conversions", label: "Conversions", num: true, fmt: U.int }, { key: "ctr", label: "CTR", num: true, fmt: function (v) { return pct(v, 2); } }, { key: "cpc", label: "CPC", num: true, fmt: function (v) { return v === null ? "n/a" : U.money2(v); } },
        { key: "cvr", label: "Conv. rate", num: true, fmt: function (v) { return pct(v, 2); } }, { key: "cpa", label: "Cost / conv.", num: true, fmt: function (v) { return v === null ? "n/a" : U.money2(v); } }],
      rows: campaigns
    }
  });

  /* ======================= 8. Education ======================= */
  var GRADES = [["A", 80], ["B", 70], ["C", 60], ["D", 50], ["F", 0]];
  function grade(m) { for (var i = 0; i < GRADES.length; i++) if (m >= GRADES[i][1]) return GRADES[i][0]; return "F"; }
  function avg(rows, f) { return rows.length ? U.sum(rows, f) / rows.length : null; }
  var BANDS = [["Under 70%", 0, 70], ["70–79%", 70, 80], ["80–89%", 80, 90], ["90–100%", 90, 101]];
  window.IF_DASHBOARDS.push({
    id: "education", order: 8, title: "Education and Student Performance", icon: "cap", data: ["students"], csv: "students",
    blurb: "Class-level marks, pass rate, grade distribution and attendance (aggregates only).",
    tags: ["Marks", "Attendance", "Privacy by design"],
    purpose: "Help a school or tutoring provider examine class-level academic performance and how attendance relates to marks.",
    problem: "Marks live in many spreadsheets, so class-level patterns and assessment trends are hard to see without exposing individual students.",
    learn: ["Which subjects and classes have the highest and lowest average marks", "How grades are distributed", "Whether higher attendance goes with higher marks in this sample"],
    sampleNote: "All students and marks are fictional and synthetic. Student IDs are pseudonymous and never displayed: this dashboard shows aggregates only, and groups with fewer than 10 records are not shown in the table. The attendance link is an observed pattern in sample data, not proof of cause.",
    definitions: ["Pass rate = results with marks ≥ the pass mark (50) ÷ all results in the selection.", "Grade bands: A 80+, B 70–79, C 60–69, D 50–59, F below 50.", "Attendance rate = average of the attendance % recorded with each result.", "Students included = distinct (pseudonymous) students in the selection."],
    prepare: function (raw) {
      var d = raw.students, rows = d.rows.map(function (r) { return { student: r[0], cls: r[1], subject: r[2], assessment: r[3], month: r[4], marks: r[5], att: r[6], grade: grade(r[5]) }; });
      return { rows: rows, subjects: d.subjects, classes: d.classes, assessments: d.assessments, pass: d.passMark };
    },
    filters: [{ id: "cls", type: "select", field: "cls", label: "Class", options: function (c) { return c.classes; } }, { id: "subject", type: "select", field: "subject", label: "Subject", options: function (c) { return c.subjects; } }, { id: "assessment", type: "select", field: "assessment", label: "Assessment", options: function (c) { return c.assessments; } }],
    kpis: function (rows, ctx) {
      var passed = rows.filter(function (r) { return r.marks >= ctx.pass; }).length;
      return [
        { label: "Average Marks", value: U.dec1(avg(rows, function (r) { return r.marks; })), sub: "Out of 100" }, { label: "Pass Rate", value: pct(passed / rows.length), sub: passed + " of " + rows.length + " results ≥ " + ctx.pass },
        { label: "Attendance Rate", value: U.dec1(avg(rows, function (r) { return r.att; })) + "%", sub: "Average recorded attendance" }, { label: "Students Included", value: U.int(U.uniq(rows.map(function (r) { return r.student; })).length), sub: "Pseudonymous, not shown" }
      ];
    },
    charts: [
      { id: "subject", title: "Average marks by subject", desc: "Mean marks per subject.", crossFilter: { filter: "subject" }, config: function (rows, ctx) {
          var g = U.groupBy(rows, function (r) { return r.subject; }), labels = ctx.subjects.filter(function (s) { return g.has(s); });
          return { type: "bar", data: { labels: labels, datasets: [{ label: "Average marks", data: labels.map(function (s) { return avg(g.get(s), function (r) { return r.marks; }); }), backgroundColor: PAL[0] }] }, options: { scales: { y: { max: 100 } } } };
        }, summary: function (rows, ctx) { var g = U.groupBy(rows, function (r) { return r.subject; }), e = Array.from(g.entries()).map(function (x) { return [x[0], avg(x[1], function (r) { return r.marks; })]; }).sort(function (a, b) { return b[1] - a[1]; }); return e[0][0] + " has the highest average (" + U.dec1(e[0][1]) + "); " + e[e.length - 1][0] + " the lowest (" + U.dec1(e[e.length - 1][1]) + ")."; }, valueFmt: U.dec1 },
      { id: "grades", title: "Grade distribution", desc: "Number of results in each grade band.", config: function (rows) {
          var c = GRADES.map(function (g) { return rows.filter(function (r) { return r.grade === g[0]; }).length; });
          return { type: "bar", data: { labels: GRADES.map(function (g) { return "Grade " + g[0]; }), datasets: [{ label: "Results", data: c, backgroundColor: PAL[2] }] }, options: intTip };
        }, summary: function (rows) { var c = GRADES.map(function (g) { return rows.filter(function (r) { return r.grade === g[0]; }).length; }); var i = c.indexOf(Math.max.apply(null, c)); return "Most results are Grade " + GRADES[i][0] + " (" + U.int(c[i]) + " of " + U.int(rows.length) + ")."; }, valueFmt: U.int },
      { id: "attend", title: "Attendance versus marks", desc: "Average marks by attendance band (grouped, no individual students shown).", config: function (rows) {
          var vals = BANDS.map(function (b) { var l = rows.filter(function (r) { return r.att >= b[1] && r.att < b[2]; }); return l.length >= 10 ? avg(l, function (r) { return r.marks; }) : null; });
          return { type: "bar", data: { labels: BANDS.map(function (b) { return b[0]; }), datasets: [{ label: "Average marks", data: vals, backgroundColor: PAL[1] }] }, options: { scales: { y: { max: 100 } } } };
        }, summary: function (rows) { var v = BANDS.map(function (b) { var l = rows.filter(function (r) { return r.att >= b[1] && r.att < b[2]; }); return l.length >= 10 ? avg(l, function (r) { return r.marks; }) : null; }).filter(function (x) { return x !== null; }); return v.length > 1 ? "Average marks run from " + U.dec1(v[0]) + " (lowest attendance band shown) to " + U.dec1(v[v.length - 1]) + " (highest). This is an association in sample data, not a proven cause." : "Not enough records in the selection to compare attendance bands."; }, valueFmt: function (v) { return v === null ? "n/a (under 10 records)" : U.dec1(v); } },
      { id: "time", title: "Assessment results over time", desc: "Average marks per assessment, one line per class.", config: function (rows, ctx) {
          var classes = ctx.classes.filter(function (c) { return rows.some(function (r) { return r.cls === c; }); });
          return { type: "line", data: { labels: ctx.assessments, datasets: classes.map(function (c, i) { return { label: c, data: ctx.assessments.map(function (a) { var l = rows.filter(function (r) { return r.cls === c && r.assessment === a; }); return l.length ? avg(l, function (r) { return r.marks; }) : null; }), borderColor: PAL[i], backgroundColor: PAL[i], spanGaps: true }; }) }, options: { scales: { y: { beginAtZero: false, suggestedMin: 40, max: 100 } } } };
        }, summary: function (rows, ctx) { var l1 = rows.filter(function (r) { return r.assessment === ctx.assessments[0]; }), l4 = rows.filter(function (r) { return r.assessment === ctx.assessments[ctx.assessments.length - 1]; }); return l1.length && l4.length ? "Average marks moved from " + U.dec1(avg(l1, function (r) { return r.marks; })) + " (" + ctx.assessments[0] + ") to " + U.dec1(avg(l4, function (r) { return r.marks; })) + " (" + ctx.assessments[ctx.assessments.length - 1] + ")." : "Select all assessments to see the trend."; }, valueFmt: U.dec1 }
    ],
    table: {
      title: "Class and subject summary (groups under 10 records are hidden)", pageSize: 10, sort: { key: "avg", dir: "desc" },
      columns: [{ key: "cls", label: "Class" }, { key: "subject", label: "Subject" }, { key: "n", label: "Results", num: true }, { key: "avg", label: "Average marks", num: true, fmt: U.dec1 }, { key: "pass", label: "Pass rate", num: true, fmt: function (v) { return pct(v); } }, { key: "att", label: "Avg attendance %", num: true, fmt: U.dec1 }],
      rows: function (rows, ctx) {
        var g = U.groupBy(rows, function (r) { return r.cls + "|" + r.subject; }), out = [];
        g.forEach(function (l) { if (l.length >= 10) out.push({ cls: l[0].cls, subject: l[0].subject, n: l.length, avg: avg(l, function (r) { return r.marks; }), pass: l.filter(function (r) { return r.marks >= ctx.pass; }).length / l.length, att: avg(l, function (r) { return r.att; }) }); });
        return out;
      }
    }
  });

  /* ======================= 9. Data Quality ======================= */
  var RULE_NAMES = { product_missing: "Required: product", date_missing: "Required: date", qty_missing: "Required: quantity", price_missing: "Required: unit price", region_missing: "Required: region", date_invalid: "Date must be a real date", qty_negative: "Quantity must be positive", qty_zero: "Quantity must be positive", qty_whole: "Quantity must be whole", qty_invalid: "Quantity must be numeric", price_invalid: "Price must be a valid amount", region_invalid: "Region must be in allowed list" };
  var FIELD_NAMES = { product: "Product", orderDate: "Order date", quantity: "Quantity", unitPrice: "Unit price", region: "Region" };
  function qFlags(r) {
    var k = r.issues.map(function (i) { return i.kind; });
    return { missing: r.issues.filter(function (i) { return i.kind === "missing"; }).length, hasMissing: k.indexOf("missing") !== -1, hasInvalid: k.indexOf("invalid") !== -1, hasFormat: k.indexOf("formatting") !== -1, hasDup: k.indexOf("duplicate") !== -1 };
  }
  window.IF_DASHBOARDS.push({
    id: "quality", order: 9, title: "Data Quality", icon: "shield", data: ["quality"], csv: "quality",
    blurb: "Before-and-after quality metrics from real validation and cleaning rules.",
    tags: ["Validation", "Duplicates", "Completeness"],
    purpose: "Show the condition of a dataset before and after cleaning, and let you inspect exactly what happened to each row.",
    problem: "Analysis built on duplicated, incomplete or inconsistent records produces confident-looking but unreliable numbers.",
    learn: ["How many records fail explicit validation rules, and which rules", "What changes automatically (formatting) versus what is flagged for a person to decide", "Why completeness barely moves: missing values are flagged, never invented"],
    sampleNote: "A synthetic order export (254 rows) with documented, deliberately injected problems. Every figure below is computed live by running the cleaning rules in your browser over that data; nothing is hard-coded.",
    definitions: ["Required fields: product, order date, quantity, unit price, region.", "Missing values = empty required cells. Completeness = 1 − missing cells ÷ (records × 5 required fields).", "Invalid record = violates at least one explicit rule: a required field is missing, the date is not a real date (slash dates are read day-first), quantity is not a positive whole number, price is not a valid non-negative amount, or region is not North/South/East/West.", "Exact duplicate = same order ID, product, date, quantity and price after formatting is standardized. Extra copies are removed; the first is kept.", "Formatting inconsistencies (case, spaces, date style, currency symbols) are standardized and are not counted as invalid.", "Negative quantities are flagged, not changed: they may be returns."],
    prepare: function (raw) {
      var d = raw.quality, objs = d.rows.map(function (r) { return { orderId: r[0], customerId: r[1], product: r[2], orderDate: r[3], quantity: r[4], unitPrice: r[5], region: r[6] }; });
      var res = C.processRows(objs, { dateConvention: "dmy", allowedRegions: d.allowedRegions, requiredFields: ["product", "orderDate", "quantity", "unitPrice", "region"], canonicalProducts: ["Laptop Pro 14", "Wireless Mouse", "Mechanical Keyboard", "27-inch Monitor", "USB-C Hub", "Desk Lamp", "Ergonomic Chair", "Webcam HD"] });
      var sources = {}; res.records.forEach(function (r) { if (r.dupOf !== null) sources[r.dupOf] = true; });
      var rows = res.records.map(function (r) {
        var f = qFlags(r);
        return { n: r.index + 1, orderId: r.raw.orderId, rawProduct: r.raw.product, product: r.clean.product, rawDate: r.raw.orderDate, date: r.clean.orderDate, rawQty: r.raw.quantity, rawPrice: r.raw.unitPrice, region: r.clean.region || r.raw.region,
          status: r.status, issues: r.issues.map(function (i) { return i.message; }).join("; "), treatment: r.issues.map(function (i) { return i.treatment; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join("; "),
          missing: f.missing, hasMissing: f.hasMissing, hasInvalid: f.hasInvalid || f.hasMissing, hasFormat: f.hasFormat, hasDup: f.hasDup, isDupSource: !!sources[r.index], issueList: r.issues, _cls: r.status === "removed" ? "removed" : r.status === "flagged" ? "flagged" : "" };
      });
      return { rows: rows, result: res, required: 5 };
    },
    filters: [
      { id: "kind", type: "select", label: "Issue category", allLabel: "All records", options: [{ value: "missing", label: "Missing values" }, { value: "invalid", label: "Violates a validation rule" }, { value: "format", label: "Formatting inconsistencies" }, { value: "dup", label: "Exact duplicates" }, { value: "clean", label: "No issues" }],
        pred: function (r, v) { return v === "All" || (v === "missing" ? r.hasMissing : v === "invalid" ? r.hasInvalid : v === "format" ? r.hasFormat : v === "dup" ? r.hasDup : r.issueList.length === 0); } },
      { id: "q", type: "text", label: "Search order ID or product", fields: ["orderId", "rawProduct", "product"], placeholder: "e.g. QO-5010 or keyboard" }
    ],
    kpis: function (rows, ctx) {
      var missing = U.sum(rows, function (r) { return r.missing; }), cells = rows.length * ctx.required;
      return [
        { label: "Total Records", value: U.int(rows.length) }, { label: "Missing Values", value: U.int(missing), sub: "Empty required cells" },
        { label: "Duplicate Records", value: U.int(rows.filter(function (r) { return r.hasDup; }).length), sub: "Extra copies of an exact row" },
        { label: "Invalid Records", value: U.int(rows.filter(function (r) { return r.hasInvalid; }).length), sub: "Violate ≥ 1 explicit rule" },
        { label: "Completeness Rate", value: pct(cells ? 1 - missing / cells : null), sub: "1 − missing ÷ (records × 5)" }
      ];
    },
    charts: [
      { id: "missing", title: "Missing values by column", desc: "Empty required cells per column.", config: function (rows) {
          var keys = Object.keys(FIELD_NAMES), counts = keys.map(function (k) { return U.sum(rows, function (r) { return r.issueList.filter(function (i) { return i.kind === "missing" && i.field === k; }).length; }); });
          return { type: "bar", data: { labels: keys.map(function (k) { return FIELD_NAMES[k]; }), datasets: [{ label: "Missing values", data: counts, backgroundColor: PAL[0] }] }, options: intTip };
        }, summary: function (rows) { var keys = Object.keys(FIELD_NAMES), counts = keys.map(function (k) { return U.sum(rows, function (r) { return r.issueList.filter(function (i) { return i.kind === "missing" && i.field === k; }).length; }); }); var i = counts.indexOf(Math.max.apply(null, counts)); return Math.max.apply(null, counts) ? FIELD_NAMES[keys[i]] + " has the most missing values (" + counts[i] + ")." : "No missing values in this selection."; }, valueFmt: U.int },
      { id: "dups", title: "Duplicate rows", desc: "Rows by duplicate status.", config: function (rows) {
          var extra = rows.filter(function (r) { return r.hasDup; }).length, src = rows.filter(function (r) { return r.isDupSource; }).length;
          return { type: "bar", data: { labels: ["Unique rows", "Rows that have a duplicate (kept)", "Extra copies (removed)"], datasets: [{ label: "Rows", data: [rows.length - extra - src, src, extra], backgroundColor: PAL[1] }] }, options: Object.assign({ indexAxis: "y" }, intTip) };
        }, summary: function (rows) { return U.int(rows.filter(function (r) { return r.hasDup; }).length) + " extra copies are removed by the exact-duplicate rule."; }, valueFmt: U.int },
      { id: "rules", title: "Validation failures by rule", desc: "Explicit rule violations (formatting fixes are not failures).", tall: true, config: function (rows) {
          var m = new Map(); rows.forEach(function (r) { r.issueList.forEach(function (i) { if (i.kind === "missing" || i.kind === "invalid") { var n = RULE_NAMES[i.code] || i.code; m.set(n, (m.get(n) || 0) + 1); } }); });
          var e = sortedEntries(m, true);
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Failures", data: e.map(function (x) { return x[1]; }), backgroundColor: PAL[4] }] }, options: Object.assign({ indexAxis: "y" }, intTip) };
        }, summary: function (rows) { var n = 0; rows.forEach(function (r) { n += r.issueList.filter(function (i) { return i.kind === "missing" || i.kind === "invalid"; }).length; }); return U.int(n) + " rule violations across " + U.int(rows.filter(function (r) { return r.hasInvalid; }).length) + " records."; }, valueFmt: U.int },
      { id: "ba", title: "Before versus after cleaning", desc: "Records affected, computed from the rules actually applied.", tall: true, config: function (rows) {
          var kept = rows.filter(function (r) { return r.status !== "removed"; });
          var before = [rows.filter(function (r) { return r.hasMissing; }).length, rows.filter(function (r) { return r.hasDup; }).length, rows.filter(function (r) { return r.hasInvalid; }).length, rows.filter(function (r) { return r.hasFormat; }).length, rows.filter(function (r) { return r.hasInvalid; }).length];
          var after = [kept.filter(function (r) { return r.hasMissing; }).length, 0, kept.filter(function (r) { return r.hasInvalid; }).length, 0, kept.filter(function (r) { return r.status === "flagged"; }).length];
          return { type: "bar", data: { labels: ["With missing values", "Exact duplicates", "Violating a rule", "Formatting issues", "Needing manual review"], datasets: [{ label: "Before", data: before, backgroundColor: PAL[1] }, { label: "After", data: after, backgroundColor: PAL[0] }] }, options: intTip };
        }, summary: function () { return "Formatting issues and duplicates drop to zero; missing and invalid values remain because they are flagged for review, not guessed."; }, valueFmt: U.int }
    ],
    table: {
      title: "Row inspector: original value, cleaned value and treatment", pageSize: 10, sort: { key: "n", dir: "asc" },
      columns: [{ key: "n", label: "Row", num: true }, { key: "orderId", label: "Order ID" }, { key: "rawProduct", label: "Original product" }, { key: "product", label: "Cleaned product" }, { key: "rawDate", label: "Original date" }, { key: "date", label: "Cleaned date" },
        { key: "rawQty", label: "Qty" }, { key: "rawPrice", label: "Original price" }, { key: "status", label: "Result", fmt: function (v) { return v === "removed" ? "Removed (duplicate)" : v === "flagged" ? "Flagged for review" : v === "fixed" ? "Standardized" : "No change"; } },
        { key: "issues", label: "What was found" }, { key: "treatment", label: "How it was handled" }],
      rows: function (rows) { return rows; }
    },
    export: { columns: [["n", "Row"], ["orderId", "Order ID"], ["rawProduct", "Original product"], ["product", "Cleaned product"], ["rawDate", "Original date"], ["date", "Cleaned date"], ["rawQty", "Quantity"], ["rawPrice", "Original price"], ["status", "Result"], ["issues", "Issues"], ["treatment", "Treatment"]].map(function (c) { return { key: c[0], label: c[1] }; }), rows: function (rows) { return rows; } }
  });

  /* ======================= 10. Monthly Business Reporting ======================= */
  function monthKpiRows(rows, m) {
    var k = P.salesKpis(rows.filter(function (r) { return r.month === m; }));
    var discount = U.sum(rows.filter(function (r) { return r.month === m; }), function (r) { return r.qty * r.price * r.disc; });
    return { revenue: k.revenue, orders: k.orders, aov: k.aov, units: k.units, profit: k.profit, margin: k.margin, discount: discount };
  }
  window.IF_DASHBOARDS.push({
    id: "monthly", order: 10, title: "Monthly Business Reporting", icon: "table", data: ["sales"], csv: "sales",
    blurb: "Compare any two reporting months with safe percentage changes and an export.",
    tags: ["Period comparison", "KPI table", "Export"],
    purpose: "Compare performance across reporting periods the way a monthly management report does.",
    problem: "Preparing month-on-month comparisons by hand is slow, and percentage changes from a zero baseline are easy to get wrong.",
    learn: ["How the selected month compares with another month on revenue, orders, margin and discounts", "Which categories drove the change", "Where the selected months sit in the yearly trend"],
    sampleNote: "This dashboard uses the same synthetic 2025 sales dataset as the other sales dashboards. It is not connected to any real accounting or sales system.",
    definitions: ["Absolute change = current − previous.", "Percentage change = (current − previous) ÷ previous. When the previous value is zero or missing it is shown as “n/a” (no baseline), never as infinity or a misleading figure.", "Gross profit and margin use rows with cost data; discounts = list price value minus revenue.", "Choosing the same month for both periods is allowed and gives zero change."],
    prepare: function (raw) { var c = H.salesPrep(raw); c.monthOpts = c.months.map(function (m) { return { value: m, label: U.monthLabel(m, true) }; }); return c; },
    filters: [
      { id: "cur", type: "select", label: "Current period", noAll: true, options: function (c) { return c.monthOpts; }, def: "2025-12", pred: function () { return true; } },
      { id: "prev", type: "select", label: "Comparison period", noAll: true, options: function (c) { return c.monthOpts; }, def: "2025-11", pred: function () { return true; } },
      H.fReg
    ],
    kpis: function (rows, ctx, st) {
      var a = monthKpiRows(rows, st.cur).revenue, b = monthKpiRows(rows, st.prev).revenue, ch = U.pctChange(a, b);
      return [
        { label: "Current-Period Revenue", value: money(a), sub: U.monthLabel(st.cur, true) }, { label: "Previous-Period Revenue", value: money(b), sub: U.monthLabel(st.prev, true) },
        { label: "Absolute Change", value: (a - b > 0 ? "+" : "") + money(a - b), sub: "Current − previous" },
        { label: "Percentage Change", value: ch === null ? "n/a" : U.signedPct(ch), sub: ch === null ? "No baseline: previous period is zero" : "(Current − previous) ÷ previous", delta: ch, deltaNA: "No usable baseline" }
      ];
    },
    charts: [
      { id: "cvp", title: "Current versus previous period by category", desc: "Revenue per category in each selected month.", wide: true, config: function (rows, ctx, st) {
          var cats = ctx.categories, f = function (m) { var g = byKey(rows.filter(function (r) { return r.month === m; }), function (r) { return r.category; }, function (r) { return r.revenue; }); return cats.map(function (c) { return g.get(c) || 0; }); };
          return { type: "bar", data: { labels: cats, datasets: [{ label: "Current: " + U.monthLabel(st.cur, true), data: f(st.cur), backgroundColor: PAL[0] }, { label: "Previous: " + U.monthLabel(st.prev, true), data: f(st.prev), backgroundColor: PAL[3] }] }, options: H.moneyY };
        }, summary: function (rows, ctx, st) { var a = monthKpiRows(rows, st.cur).revenue, b = monthKpiRows(rows, st.prev).revenue; var ch = U.pctChange(a, b); return "Revenue was " + money(a) + " in " + U.monthLabel(st.cur, true) + " versus " + money(b) + " in " + U.monthLabel(st.prev, true) + (ch === null ? " (percentage change not available)." : " (" + U.signedPct(ch) + ")."); }, valueFmt: money },
      { id: "trend", title: "Monthly revenue trend", desc: "All months; the two selected periods are marked with larger points.", config: function (rows, ctx, st) {
          var vals = P.monthlySeries(rows, ctx.months, function (r) { return r.revenue; });
          return { type: "line", data: { labels: ctx.months.map(ml), datasets: [{ label: "Revenue", data: vals, borderColor: PAL[0], backgroundColor: ctx.months.map(function (m) { return m === st.cur ? PAL[0] : m === st.prev ? PAL[3] : "#fff"; }), pointRadius: ctx.months.map(function (m) { return m === st.cur || m === st.prev ? 7 : 3; }), pointBorderColor: PAL[0] }] }, options: H.moneyY };
        }, summary: function (rows, ctx) { var v = P.monthlySeries(rows, ctx.months, function (r) { return r.revenue; }); return peak(ctx.months.map(ml), v, money, "revenue"); }, valueFmt: money },
      { id: "contrib", title: "Category contribution (current period)", desc: "Share of current-period revenue by category.", config: function (rows, ctx, st) {
          var g = byKey(rows.filter(function (r) { return r.month === st.cur; }), function (r) { return r.category; }, function (r) { return r.revenue; }), e = sortedEntries(g, true);
          return H.doughnut(e, H.catColors(e.map(function (x) { return x[0]; })), money);
        }, summary: function (rows, ctx, st) { var g = byKey(rows.filter(function (r) { return r.month === st.cur; }), function (r) { return r.category; }, function (r) { return r.revenue; }), e = sortedEntries(g, true), t = U.sum(e, function (x) { return x[1]; }); return e.length ? e[0][0] + " contributed the most (" + pct(e[0][1] / t) + " of revenue)." : "No revenue in the current period."; }, valueFmt: money }
    ],
    table: {
      title: "KPI comparison", pageSize: 10, sort: { key: "order", dir: "asc" },
      columns: [{ key: "metric", label: "Metric" }, { key: "cur", label: "Current", num: true, fmt: function (v, r) { return r.f(v); } }, { key: "prev", label: "Previous", num: true, fmt: function (v, r) { return r.f(v); } },
        { key: "chg", label: "Change", num: true, fmt: function (v, r) { return v === null ? "n/a" : (r.pctPoints ? (v > 0 ? "+" : "") + (v * 100).toFixed(1) + " pts" : (v > 0 ? "+" : "") + r.f(v)); } }, { key: "pc", label: "% change", num: true, fmt: function (v) { return v === null ? "n/a (no baseline)" : U.signedPct(v); } }],
      rows: function (rows, ctx, st) {
        var a = monthKpiRows(rows, st.cur), b = monthKpiRows(rows, st.prev);
        function line(order, metric, k, f, pts) { var x = a[k], y = b[k]; return { order: order, metric: metric, cur: x, prev: y, chg: U.isNum(x) && U.isNum(y) ? x - y : null, pc: pts ? null : U.pctChange(x, y), f: function (v) { return v === null || v === undefined ? "n/a" : f(v); }, pctPoints: !!pts }; }
        return [line(1, "Revenue", "revenue", money), line(2, "Orders", "orders", U.int), line(3, "Average order value", "aov", U.money2), line(4, "Units sold", "units", U.int), line(5, "Gross profit", "profit", money), line(6, "Gross margin", "margin", function (v) { return pct(v); }, true), line(7, "Discounts given", "discount", money)];
      }
    },
    export: { columns: [{ key: "metric", label: "Metric" }, { key: "cur", label: "Current period" }, { key: "prev", label: "Comparison period" }, { key: "chg", label: "Absolute change" }, { key: "pc", label: "Percentage change (blank = no baseline)" }],
      rows: function (rows, ctx, st) { var a = monthKpiRows(rows, st.cur), b = monthKpiRows(rows, st.prev); return [["Revenue", "revenue"], ["Orders", "orders"], ["Average order value", "aov"], ["Units sold", "units"], ["Gross profit", "profit"], ["Gross margin", "margin"], ["Discounts given", "discount"]].map(function (m) { var x = a[m[1]], y = b[m[1]]; return { metric: m[0], cur: x === null ? "" : U.round2(x), prev: y === null ? "" : U.round2(y), chg: U.isNum(x) && U.isNum(y) ? U.round2(x - y) : "", pc: m[1] === "margin" ? "" : (U.pctChange(x, y) === null ? "" : U.round2(U.pctChange(x, y) * 100) + "%") }; }); } }
  });

  /* ======================= 11. Website Analytics ======================= */
  window.IF_DASHBOARDS.push({
    id: "web", order: 11, title: "Website Analytics", icon: "globe", data: ["web"], csv: "web",
    blurb: "Sessions, conversion rate, traffic sources and landing pages.",
    tags: ["Traffic", "Conversion", "Landing pages"],
    purpose: "Show how a website's traffic sources and landing pages perform on visits and conversions.",
    problem: "Analytics tools bury the few views a small business actually needs for decisions.",
    learn: ["Which traffic sources bring the most visits and the best conversion", "Which landing pages convert best", "How weekly sessions moved through the year"],
    sampleNote: "Synthetic weekly website data. It is not connected to Google Analytics or any other analytics service; no live integration is implemented.",
    definitions: ["Conversion rate = conversions ÷ sessions.", "Users = the sum of weekly users per source and page. It is not de-duplicated across weeks, so it is not a count of unique people.", "Weeks are identified by their Monday start date."],
    prepare: function (raw) {
      var d = raw.web, rows = d.rows.map(function (r) { return { date: r[0], month: r[0].slice(0, 7), source: r[1], page: r[2], sessions: r[3], users: r[4], conversions: r[5] }; });
      var dates = rows.map(function (r) { return r.date; }).sort();
      return { rows: rows, minDate: dates[0], maxDate: dates[dates.length - 1], months: U.sortedUniq(rows.map(function (r) { return r.month; })), sources: d.sources, pages: d.pages };
    },
    filters: [{ id: "date", type: "date", label: "Week starting" }, { id: "source", type: "select", field: "source", label: "Traffic source", options: function (c) { return c.sources; } }, { id: "page", type: "select", field: "page", label: "Landing page", options: function (c) { return c.pages; } }],
    kpis: function (rows) {
      var s = U.sum(rows, function (r) { return r.sessions; }), u = U.sum(rows, function (r) { return r.users; }), c = U.sum(rows, function (r) { return r.conversions; });
      var m = byKey(rows, function (r) { return r.source; }, function (r) { return r.sessions; }), top = sortedEntries(m, true)[0];
      return [{ label: "Sessions", value: U.int(s) }, { label: "Users", value: U.int(u), sub: "Sum of weekly users (not unique)" }, { label: "Conversion Rate", value: pct(U.div(c, s), 2), sub: U.int(c) + " conversions ÷ sessions" }, { label: "Top Traffic Source", value: top[0], sub: pct(top[1] / s) + " of sessions" }];
    },
    charts: [
      { id: "weekly", title: "Weekly sessions", desc: "Sessions by week.", wide: true, config: function (rows) {
          var m = byKey(rows, function (r) { return r.date; }, function (r) { return r.sessions; }), ks = Array.from(m.keys()).sort();
          return { type: "line", data: { labels: ks.map(function (k) { return k.slice(5); }), datasets: [{ label: "Sessions", data: ks.map(function (k) { return m.get(k); }), borderColor: PAL[0], backgroundColor: "rgba(42,120,214,.12)", fill: true }] }, options: intTip };
        }, summary: function (rows) { var m = byKey(rows, function (r) { return r.date; }, function (r) { return r.sessions; }), ks = Array.from(m.keys()).sort(); return peak(ks.map(function (k) { return k.slice(5); }), ks.map(function (k) { return m.get(k); }), U.int, "weekly sessions"); }, valueFmt: U.int },
      { id: "src", title: "Sessions by traffic source", desc: "Total sessions per source.", crossFilter: { filter: "source" }, config: function (rows) {
          var e = sortedEntries(byKey(rows, function (r) { return r.source; }, function (r) { return r.sessions; }), true);
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Sessions", data: e.map(function (x) { return x[1]; }), backgroundColor: PAL[0] }] }, options: Object.assign({ indexAxis: "y" }, intTip) };
        }, summary: function (rows) { var e = sortedEntries(byKey(rows, function (r) { return r.source; }, function (r) { return r.sessions; }), true); return e[0][0] + " brings the most sessions (" + U.int(e[0][1]) + ")."; }, valueFmt: U.int },
      { id: "srccr", title: "Conversion rate by source", desc: "Conversions ÷ sessions.", config: function (rows) {
          var g = U.groupBy(rows, function (r) { return r.source; }), e = Array.from(g.entries()).map(function (x) { return [x[0], U.div(U.sum(x[1], function (r) { return r.conversions; }), U.sum(x[1], function (r) { return r.sessions; }))]; }).sort(function (a, b) { return b[1] - a[1]; });
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Conversion rate", data: e.map(function (x) { return x[1]; }), backgroundColor: PAL[2] }] }, options: { indexAxis: "y", scales: { x: { ticks: { callback: function (v) { return pct(v, 1); } } } }, plugins: { tooltip: { callbacks: { label: function (c) { return " " + pct(c.parsed.x, 2); } } } } } };
        }, summary: function (rows) { var g = U.groupBy(rows, function (r) { return r.source; }), e = Array.from(g.entries()).map(function (x) { return [x[0], U.sum(x[1], function (r) { return r.conversions; }) / U.sum(x[1], function (r) { return r.sessions; })]; }).sort(function (a, b) { return b[1] - a[1]; }); return e[0][0] + " converts best (" + pct(e[0][1], 2) + ")."; }, valueFmt: function (v) { return pct(v, 2); } },
      { id: "pages", title: "Landing page conversion rate", desc: "Conversions ÷ sessions by landing page.", wide: true, crossFilter: { filter: "page" }, config: function (rows) {
          var g = U.groupBy(rows, function (r) { return r.page; }), e = Array.from(g.entries()).map(function (x) { return [x[0], U.div(U.sum(x[1], function (r) { return r.conversions; }), U.sum(x[1], function (r) { return r.sessions; }))]; }).sort(function (a, b) { return b[1] - a[1]; });
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Conversion rate", data: e.map(function (x) { return x[1]; }), backgroundColor: PAL[0] }] }, options: { scales: { y: { ticks: { callback: function (v) { return pct(v, 1); } } } }, plugins: { tooltip: { callbacks: { label: function (c) { return " " + pct(c.parsed.y, 2); } } } } } };
        }, summary: function (rows) { var g = U.groupBy(rows, function (r) { return r.page; }), e = Array.from(g.entries()).map(function (x) { return [x[0], U.sum(x[1], function (r) { return r.conversions; }) / U.sum(x[1], function (r) { return r.sessions; })]; }).sort(function (a, b) { return b[1] - a[1]; }); return e[0][0] + " converts best (" + pct(e[0][1], 2) + ")."; }, valueFmt: function (v) { return pct(v, 2); } }
    ],
    table: {
      title: "Landing page performance", pageSize: 10, sort: { key: "sessions", dir: "desc" },
      columns: [{ key: "page", label: "Landing page" }, { key: "sessions", label: "Sessions", num: true, fmt: U.int }, { key: "users", label: "Users (weekly sum)", num: true, fmt: U.int }, { key: "conversions", label: "Conversions", num: true, fmt: U.int }, { key: "cr", label: "Conversion rate", num: true, fmt: function (v) { return pct(v, 2); } }],
      rows: function (rows) { var g = U.groupBy(rows, function (r) { return r.page; }), out = []; g.forEach(function (l, k) { var s = U.sum(l, function (r) { return r.sessions; }), c = U.sum(l, function (r) { return r.conversions; }); out.push({ page: k, sessions: s, users: U.sum(l, function (r) { return r.users; }), conversions: c, cr: U.div(c, s) }); }); return out; }
    }
  });

  /* ======================= 12. Operations ======================= */
  window.IF_DASHBOARDS.push({
    id: "operations", order: 12, title: "Operations and Order Fulfillment", icon: "truck", data: ["operations"], csv: "operations",
    blurb: "Processing time, on-time fulfillment and delayed orders.",
    tags: ["Fulfillment", "SLA", "Delays"],
    purpose: "Track how quickly orders are processed and where the 48-hour service target is missed.",
    problem: "Delays are noticed through customer complaints rather than seen early in the data.",
    learn: ["How many fulfilled orders met the 48-hour target", "Which carriers, hubs and months have longer processing times", "Which orders are still open"],
    sampleNote: "Synthetic fulfillment records, one per order in the sample sales dataset. They are not connected to any warehouse or shipping system.",
    definitions: ["Fulfilled = status Shipped or Delivered. Processing time = hours from order to dispatch, recorded for fulfilled orders only.", "Average processing time = mean hours over fulfilled orders (n/a when none).", "On-time fulfillment rate = fulfilled orders with processing time ≤ 48 hours ÷ fulfilled orders. Open (Processing) and Cancelled orders are not in the denominator.", "Delayed orders = fulfilled orders that took more than 48 hours."],
    prepare: function (raw) {
      var d = raw.operations, rows = d.rows.map(function (r) { var f = r[6] !== null; return { id: r[0], date: r[1], month: r[1].slice(0, 7), region: r[2], center: r[3], carrier: r[4], status: r[5], hours: r[6], sla: r[7], fulfilled: f, late: f && r[6] > r[7] }; });
      var dates = rows.map(function (r) { return r.date; }).sort();
      return { rows: rows, minDate: dates[0], maxDate: dates[dates.length - 1], months: U.sortedUniq(rows.map(function (r) { return r.month; })), carriers: d.carriers, centers: d.centers, regions: ["North", "South", "East", "West"], statuses: ["Delivered", "Shipped", "Processing", "Cancelled"] };
    },
    filters: [{ id: "date", type: "date", label: "Order date" }, { id: "carrier", type: "select", field: "carrier", label: "Carrier", options: function (c) { return c.carriers; } }, { id: "center", type: "select", field: "center", label: "Fulfillment hub", options: function (c) { return c.centers; } }, { id: "status", type: "select", field: "status", label: "Status", options: function (c) { return c.statuses; } }],
    kpis: function (rows) {
      var f = rows.filter(function (r) { return r.fulfilled; }), late = f.filter(function (r) { return r.late; }).length;
      return [
        { label: "Total Orders", value: U.int(rows.length) }, { label: "Avg Processing Time", value: f.length ? U.dec1(U.sum(f, function (r) { return r.hours; }) / f.length) + " h" : "n/a", sub: "Fulfilled orders only" },
        { label: "On-Time Fulfillment", value: pct(U.div(f.length - late, f.length)), sub: (f.length - late) + " of " + f.length + " fulfilled ≤ 48 h" }, { label: "Delayed Orders", value: U.int(late), sub: "Fulfilled in more than 48 h" }
      ];
    },
    charts: [
      { id: "status", title: "Order status distribution", desc: "Orders by current status.", crossFilter: { filter: "status" }, config: function (rows, ctx) {
          var m = byKey(rows, function (r) { return r.status; }, function () { return 1; }), e = ctx.statuses.filter(function (s) { return m.has(s); }).map(function (s) { return [s, m.get(s)]; });
          var col = { Delivered: PAL[0], Shipped: PAL[2], Processing: PAL[3], Cancelled: PAL[6] };
          return H.doughnut(e, e.map(function (x) { return col[x[0]]; }), U.int);
        }, summary: function (rows, ctx) { var m = byKey(rows, function (r) { return r.status; }, function () { return 1; }); return ctx.statuses.filter(function (s) { return m.has(s); }).map(function (s) { return s + " " + U.int(m.get(s)); }).join("; ") + "."; }, valueFmt: U.int },
      { id: "ontime", title: "On-time rate by month", desc: "Fulfilled orders processed within 48 hours ÷ fulfilled orders.", config: function (rows, ctx, st) {
          var ms = ctx.months.filter(function (m) { return m >= st.date.from.slice(0, 7) && m <= st.date.to.slice(0, 7); }), g = U.groupBy(rows.filter(function (r) { return r.fulfilled; }), function (r) { return r.month; });
          var vals = ms.map(function (m) { var l = g.get(m) || []; return U.div(l.filter(function (r) { return !r.late; }).length, l.length); });
          return { type: "line", data: { labels: ms.map(ml), datasets: [{ label: "On-time rate", data: vals, borderColor: PAL[0], backgroundColor: PAL[0], spanGaps: true }] }, options: { scales: { y: { beginAtZero: false, suggestedMax: 1, ticks: { callback: pctTick } } }, plugins: { tooltip: { callbacks: { label: D.tipPct } } } } };
        }, summary: function (rows, ctx, st) { var ms = ctx.months.filter(function (m) { return m >= st.date.from.slice(0, 7) && m <= st.date.to.slice(0, 7); }), g = U.groupBy(rows.filter(function (r) { return r.fulfilled; }), function (r) { return r.month; }); var v = ms.map(function (m) { var l = g.get(m) || []; return l.length ? l.filter(function (r) { return !r.late; }).length / l.length : 0; }); return peak(ms.map(ml), v, pct, "on-time rate"); }, valueFmt: function (v) { return v === null ? "n/a" : pct(v); } },
      { id: "carrier", title: "Average processing time by carrier", desc: "Hours, fulfilled orders only.", config: function (rows, ctx) {
          var g = U.groupBy(rows.filter(function (r) { return r.fulfilled; }), function (r) { return r.carrier; }), labels = ctx.carriers.filter(function (c) { return g.has(c); });
          return { type: "bar", data: { labels: labels, datasets: [{ label: "Avg hours", data: labels.map(function (c) { return U.sum(g.get(c), function (r) { return r.hours; }) / g.get(c).length; }), backgroundColor: PAL[2] }] }, options: { plugins: { tooltip: { callbacks: { label: function (c) { return " " + U.dec1(c.parsed.y) + " hours"; } } } } } };
        }, summary: function (rows, ctx) { var g = U.groupBy(rows.filter(function (r) { return r.fulfilled; }), function (r) { return r.carrier; }); var e = Array.from(g.entries()).map(function (x) { return [x[0], U.sum(x[1], function (r) { return r.hours; }) / x[1].length]; }).sort(function (a, b) { return a[1] - b[1]; }); return e.length ? e[0][0] + " is fastest on average (" + U.dec1(e[0][1]) + " h)." : "No fulfilled orders in this selection."; }, valueFmt: U.dec1 },
      { id: "delayed", title: "Delayed orders by month", desc: "Fulfilled orders that took more than 48 hours.", config: function (rows, ctx, st) {
          var ms = ctx.months.filter(function (m) { return m >= st.date.from.slice(0, 7) && m <= st.date.to.slice(0, 7); }), g = U.groupBy(rows.filter(function (r) { return r.late; }), function (r) { return r.month; });
          return { type: "bar", data: { labels: ms.map(ml), datasets: [{ label: "Delayed orders", data: ms.map(function (m) { return (g.get(m) || []).length; }), backgroundColor: PAL[1] }] }, options: intTip };
        }, summary: function (rows) { return U.int(rows.filter(function (r) { return r.late; }).length) + " delayed orders in this selection."; }, valueFmt: U.int }
    ],
    table: {
      title: "Orders (longest processing time first)", pageSize: 10, sort: { key: "hours", dir: "desc" },
      columns: [{ key: "id", label: "Order" }, { key: "date", label: "Order date" }, { key: "region", label: "Region" }, { key: "center", label: "Hub" }, { key: "carrier", label: "Carrier" }, { key: "status", label: "Status" },
        { key: "hours", label: "Processing (h)", num: true, fmt: function (v) { return v === null ? "n/a" : v; } }, { key: "result", label: "Against 48 h target" }],
      rows: function (rows) { return rows.map(function (r) { return { id: r.id, date: r.date, region: r.region, center: r.center, carrier: r.carrier, status: r.status, hours: r.hours, result: !r.fulfilled ? (r.status === "Cancelled" ? "Cancelled" : "Open") : r.late ? "Delayed" : "On time" }; }); }
    }
  });
})();
