/* Dashboard definitions 1-4 (sales based) + shared helpers (window.IFDH).
   Each definition is plain data + small pure functions consumed by js/engine.js. */
(function () {
  "use strict";
  var U = window.IFU, P = window.IFP, D = window.IFDash;
  var CAT = D.CAT_COLORS, REG = D.REGION_COLORS, PAL = D.PALETTE;
  window.IF_DASHBOARDS = window.IF_DASHBOARDS || [];

  /* ---------------- shared helpers ---------------- */
  function salesPrep(raw) { return P.prepareSales(raw.sales); }
  function monthsFor(ctx, st) { var f = st.date.from.slice(0, 7), t = st.date.to.slice(0, 7); return ctx.months.filter(function (m) { return m >= f && m <= t; }); }
  function ml(m) { return U.monthLabel(m); }
  function byKey(rows, keyFn, valFn) {
    var m = new Map();
    rows.forEach(function (r) { var k = keyFn(r); m.set(k, (m.get(k) || 0) + valFn(r)); });
    return m;
  }
  function sortedEntries(map, desc) { return Array.from(map.entries()).sort(function (a, b) { return desc ? b[1] - a[1] : a[1] - b[1]; }); }
  function peak(labels, values, fmt, what) {
    if (!labels.length) return "";
    var hi = 0, lo = 0;
    values.forEach(function (v, i) { if (v > values[hi]) hi = i; if (v < values[lo]) lo = i; });
    return "Highest " + (what || "value") + ": " + labels[hi] + " (" + fmt(values[hi]) + "). Lowest: " + labels[lo] + " (" + fmt(values[lo]) + ").";
  }
  var money = U.money, pct = U.pct;
  var moneyY = { scales: { y: { ticks: { callback: D.moneyTick } } }, plugins: { tooltip: { callbacks: { label: D.tipMoney } } } };
  var moneyX = { indexAxis: "y", scales: { x: { ticks: { callback: D.moneyTick } } }, plugins: { tooltip: { callbacks: { label: D.tipMoney } } } };
  function days(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
  function dayList(from, to) {
    var out = [], d = new Date(from + "T00:00:00Z"), end = new Date(to + "T00:00:00Z");
    while (d <= end) { out.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86400000); }
    return out;
  }
  /** Series by day (range <= 62 days) or by month. */
  function periodSeries(rows, ctx, st, valFn) {
    var from = st.date.from, to = st.date.to;
    if (days(from, to) <= 62) {
      var m = byKey(rows, function (r) { return r.date; }, valFn);
      var ds = dayList(from, to);
      return { labels: ds.map(function (d) { return d.slice(5); }), values: ds.map(function (d) { return m.get(d) || 0; }), unit: "day" };
    }
    var ms = monthsFor(ctx, st), mm = byKey(rows, function (r) { return r.month; }, valFn);
    return { labels: ms.map(ml), values: ms.map(function (k) { return mm.get(k) || 0; }), unit: "month" };
  }
  function growth(rows, ctx, st) {
    var ms = monthsFor(ctx, st); if (ms.length < 2) return null;
    var mm = byKey(rows, function (r) { return r.month; }, function (r) { return r.revenue; });
    return U.pctChange(mm.get(ms[ms.length - 1]) || 0, mm.get(ms[ms.length - 2]) || 0);
  }
  var fDate = { id: "date", type: "date", label: "Date" };
  var fCat = { id: "category", type: "select", field: "category", label: "Product category", options: function (c) { return c.categories; } };
  var fReg = { id: "region", type: "select", field: "region", label: "Region", options: function (c) { return c.regions; } };
  var orderCols = [
    { key: "id", label: "Order" }, { key: "date", label: "Date" }, { key: "product", label: "Product" }, { key: "category", label: "Category" },
    { key: "region", label: "Region" }, { key: "qty", label: "Qty", num: true }, { key: "revenue", label: "Revenue", num: true, fmt: U.money2 }, { key: "profit", label: "Gross profit", num: true, fmt: U.money2 }
  ];
  function orderRows(rows) { return rows.map(function (r) { return { id: r.id, date: r.date, product: r.product, category: r.category, region: r.region, qty: r.qty, revenue: r.revenue, profit: r.profit }; }); }
  function catColors(labels) { return labels.map(function (l) { return CAT[l] || PAL[7]; }); }
  function regColors(labels) { return labels.map(function (l) { return REG[l] || PAL[7]; }); }
  function doughnut(labelsVals, colors, tipFmt) {
    return {
      type: "doughnut",
      data: { labels: labelsVals.map(function (e) { return e[0]; }), datasets: [{ data: labelsVals.map(function (e) { return e[1]; }), backgroundColor: colors }] },
      options: { cutout: "60%", plugins: { tooltip: { callbacks: { label: function (c) { var t = c.dataset.data.reduce(function (a, b) { return a + b; }, 0); return " " + c.label + ": " + tipFmt(c.parsed) + " (" + pct(c.parsed / t) + ")"; } } } } }
    };
  }
  window.IFDH = { salesPrep: salesPrep, monthsFor: monthsFor, ml: ml, byKey: byKey, sortedEntries: sortedEntries, peak: peak, moneyY: moneyY, moneyX: moneyX, periodSeries: periodSeries, growth: growth,
    fDate: fDate, fCat: fCat, fReg: fReg, orderCols: orderCols, orderRows: orderRows, catColors: catColors, regColors: regColors, doughnut: doughnut, days: days };

  var SALES_NOTE = "This dashboard uses a synthetic sales dataset (about 3,300 orders across 30 products, 2025) generated for demonstration. It is not connected to any real company, store or payment platform.";

  /* ======================= 1. Executive Business Overview ======================= */
  window.IF_DASHBOARDS.push({
    id: "executive", order: 1, title: "Executive Business Overview", icon: "dashboard", data: ["sales"], csv: "sales",
    blurb: "A one-screen view of revenue, profit and what is driving them.",
    tags: ["Revenue", "Profit", "Categories"],
    purpose: "Give a business owner a quick, trustworthy overview of revenue, orders and profit, and show which categories and products are carrying the business.",
    problem: "Owners often piece performance together from several spreadsheets and cannot see the whole picture in one place.",
    learn: ["How revenue and gross profit moved month by month", "Which categories and products contribute most revenue", "Whether margin moves with volume or with discounting"],
    sampleNote: SALES_NOTE,
    definitions: ["Revenue = quantity × unit price × (1 − discount).", "Total Profit here is gross profit = revenue − cost of goods sold. It excludes payroll, rent and other operating costs.", "Profit margin = gross profit ÷ revenue (rows with cost data only)."],
    prepare: salesPrep, filters: [fDate, fCat, fReg],
    kpis: function (rows) {
      var k = P.salesKpis(rows);
      return [
        { label: "Total Revenue", value: money(k.revenue), sub: U.int(k.units) + " units sold" },
        { label: "Total Orders", value: U.int(k.orders), sub: "Average order " + money(k.aov) },
        { label: "Total Profit (gross)", value: money(k.profit), sub: "Revenue − cost of goods sold" },
        { label: "Profit Margin", value: pct(k.margin), sub: "Gross profit ÷ revenue" }
      ];
    },
    charts: [
      { id: "trend", title: "Revenue trend", desc: "Revenue per month (or per day for ranges up to 62 days).", config: function (rows, ctx, st) {
          var s = periodSeries(rows, ctx, st, function (r) { return r.revenue; });
          return { type: "line", data: { labels: s.labels, datasets: [{ label: "Revenue", data: s.values, borderColor: PAL[0], backgroundColor: "rgba(42,120,214,.12)", fill: true }] }, options: moneyY };
        }, summary: function (rows, ctx, st) { var s = periodSeries(rows, ctx, st, function (r) { return r.revenue; }); return peak(s.labels, s.values, money, "revenue"); },
        valueFmt: money },
      { id: "revprofit", title: "Revenue versus gross profit", desc: "Both measured in dollars on the same scale.", config: function (rows, ctx, st) {
          var ms = monthsFor(ctx, st), rv = P.monthlySeries(rows, ms, function (r) { return r.revenue; }), pf = P.monthlySeries(rows, ms, function (r) { return r.profit || 0; });
          return { type: "bar", data: { labels: ms.map(ml), datasets: [{ label: "Revenue", data: rv, backgroundColor: PAL[0] }, { label: "Gross profit", data: pf, backgroundColor: PAL[2] }] }, options: moneyY };
        }, summary: function (rows, ctx, st) { var ms = monthsFor(ctx, st); var pf = P.monthlySeries(rows, ms, function (r) { return r.profit || 0; }); return peak(ms.map(ml), pf, money, "gross profit"); }, valueFmt: money },
      { id: "category", title: "Revenue by product category", desc: "Share of revenue by category.", crossFilter: { filter: "category" }, config: function (rows) {
          var e = sortedEntries(byKey(rows, function (r) { return r.category; }, function (r) { return r.revenue; }), true);
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Revenue", data: e.map(function (x) { return x[1]; }), backgroundColor: catColors(e.map(function (x) { return x[0]; })) }] }, options: moneyX };
        }, summary: function (rows) { var e = sortedEntries(byKey(rows, function (r) { return r.category; }, function (r) { return r.revenue; }), true); var t = U.sum(e, function (x) { return x[1]; }); return e[0][0] + " is the largest category at " + money(e[0][1]) + " (" + pct(e[0][1] / t) + " of revenue)."; }, valueFmt: money },
      { id: "top", title: "Top-performing products", desc: "Top 8 products by revenue in the current selection.", config: function (rows) {
          var e = sortedEntries(byKey(rows, function (r) { return r.product; }, function (r) { return r.revenue; }), true).slice(0, 8);
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Revenue", data: e.map(function (x) { return x[1]; }), backgroundColor: PAL[0] }] }, options: moneyX };
        }, summary: function (rows) { var e = sortedEntries(byKey(rows, function (r) { return r.product; }, function (r) { return r.revenue; }), true); return e[0][0] + " leads with " + money(e[0][1]) + "."; }, valueFmt: money }
    ],
    table: { title: "Recent transactions", columns: orderCols, rows: function (rows) { return orderRows(rows); }, sort: { key: "date", dir: "desc" }, pageSize: 10 },
    export: { columns: orderCols.map(function (c) { return { key: c.key, label: c.label }; }), rows: function (rows) { return orderRows(rows); } }
  });

  /* ======================= 2. Sales Performance ======================= */
  window.IF_DASHBOARDS.push({
    id: "sales", order: 2, title: "Sales Performance", icon: "trend", data: ["sales"], csv: "sales",
    blurb: "Which products, categories, regions and periods generate sales.",
    tags: ["Sales", "Products", "Regions"],
    purpose: "Understand which products, categories, regions and periods generate sales, and how order volume moves alongside revenue.",
    problem: "Without a consistent view, teams argue about what is selling and when; decisions about stock and promotions rely on memory.",
    learn: ["How sales and order counts trend over time", "Which of the 30 products make up the top 10", "How regions compare for the same period"],
    sampleNote: SALES_NOTE,
    definitions: ["Total Sales = sum of order revenue after discounts.", "Average Order Value = total sales ÷ number of orders.", "Sales Growth = last calendar month in the selected dates versus the month before it. It needs at least two months in range and shows n/a otherwise (and when the baseline month has no sales).", "Date ranges of 62 days or fewer are charted daily; longer ranges monthly."],
    prepare: salesPrep,
    filters: [fDate, fCat, { id: "product", type: "select", field: "product", label: "Product", options: function (c) { return c.products.map(function (p) { return p.name; }).sort(); } }, fReg],
    kpis: function (rows, ctx, st) {
      var k = P.salesKpis(rows), g = growth(rows, ctx, st);
      return [
        { label: "Total Sales", value: money(k.revenue) }, { label: "Number of Orders", value: U.int(k.orders) },
        { label: "Average Order Value", value: money(k.aov) },
        { label: "Sales Growth", value: g === null ? "n/a" : U.signedPct(g), sub: "Last month vs previous month", delta: g, deltaNA: "Needs two months with a non-zero baseline" }
      ];
    },
    charts: [
      { id: "trend", title: "Sales trend", desc: "Sales over time.", wide: true, config: function (rows, ctx, st) {
          var s = periodSeries(rows, ctx, st, function (r) { return r.revenue; });
          return { type: "line", data: { labels: s.labels, datasets: [{ label: "Sales", data: s.values, borderColor: PAL[0], backgroundColor: "rgba(42,120,214,.12)", fill: true }] }, options: moneyY };
        }, summary: function (rows, ctx, st) { var s = periodSeries(rows, ctx, st, function (r) { return r.revenue; }); return peak(s.labels, s.values, money, "sales"); }, valueFmt: money },
      { id: "cat", title: "Sales by category", desc: "Share of sales by category.", crossFilter: { filter: "category" }, config: function (rows) {
          var e = sortedEntries(byKey(rows, function (r) { return r.category; }, function (r) { return r.revenue; }), true);
          return doughnut(e, catColors(e.map(function (x) { return x[0]; })), money);
        }, summary: function (rows) { var e = sortedEntries(byKey(rows, function (r) { return r.category; }, function (r) { return r.revenue; }), true); return e.map(function (x) { return x[0] + " " + money(x[1]); }).join("; ") + "."; }, valueFmt: money },
      { id: "region", title: "Regional comparison", desc: "Sales by region.", crossFilter: { filter: "region" }, config: function (rows, ctx) {
          var m = byKey(rows, function (r) { return r.region; }, function (r) { return r.revenue; });
          var labels = ctx.regions.filter(function (r) { return m.has(r); });
          return { type: "bar", data: { labels: labels, datasets: [{ label: "Sales", data: labels.map(function (l) { return m.get(l); }), backgroundColor: regColors(labels) }] }, options: moneyY };
        }, summary: function (rows) { var e = sortedEntries(byKey(rows, function (r) { return r.region; }, function (r) { return r.revenue; }), true); return e[0][0] + " is the strongest region (" + money(e[0][1]) + "); " + e[e.length - 1][0] + " the lowest (" + money(e[e.length - 1][1]) + ")."; }, valueFmt: money },
      { id: "top10", title: "Top 10 products", desc: "Highest sales in the selection.", config: function (rows) {
          var e = sortedEntries(byKey(rows, function (r) { return r.product; }, function (r) { return r.revenue; }), true).slice(0, 10);
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Sales", data: e.map(function (x) { return x[1]; }), backgroundColor: PAL[0] }] }, options: moneyX };
        }, summary: function (rows) { var e = sortedEntries(byKey(rows, function (r) { return r.product; }, function (r) { return r.revenue; }), true); return "Top product: " + e[0][0] + " with " + money(e[0][1]) + "."; }, valueFmt: money, tall: true },
      { id: "orders", title: "Order volume", desc: "Number of orders over time.", config: function (rows, ctx, st) {
          var s = periodSeries(rows, ctx, st, function () { return 1; });
          return { type: "bar", data: { labels: s.labels, datasets: [{ label: "Orders", data: s.values, backgroundColor: PAL[2] }] }, options: { plugins: { tooltip: { callbacks: { label: function (c) { return " Orders: " + U.int(c.parsed.y); } } } } } };
        }, summary: function (rows, ctx, st) { var s = periodSeries(rows, ctx, st, function () { return 1; }); return peak(s.labels, s.values, U.int, "order count"); }, valueFmt: U.int }
    ],
    table: { title: "Order lines", columns: orderCols, rows: orderRows, sort: { key: "date", dir: "desc" }, pageSize: 10 },
    export: { columns: orderCols.map(function (c) { return { key: c.key, label: c.label }; }), rows: orderRows }
  });

  /* ======================= 3. Profitability ======================= */
  function productMargins(rows) {
    var g = U.groupBy(rows.filter(function (r) { return r.cogs !== null; }), function (r) { return r.product; });
    var out = [];
    g.forEach(function (list, name) {
      var rev = U.sum(list, function (r) { return r.revenue; }), cogs = U.sum(list, function (r) { return r.cogs; });
      out.push({ product: name, category: list[0].category, orders: list.length, units: U.sum(list, function (r) { return r.qty; }), revenue: rev, cogs: cogs, profit: rev - cogs, margin: U.div(rev - cogs, rev) });
    });
    return out;
  }
  window.IF_DASHBOARDS.push({
    id: "profitability", order: 3, title: "Profitability Analysis", icon: "wallet", data: ["sales"], csv: "sales",
    blurb: "Revenue, cost of goods and gross margin by month, category and product.",
    tags: ["Margin", "COGS", "Products"],
    purpose: "Help a business see where revenue turns into gross profit and where discounting or product mix squeezes margin.",
    problem: "High revenue can hide low-margin products. Without cost data beside sales, margin problems stay invisible.",
    learn: ["Which categories earn the most gross profit, not just revenue", "How monthly gross margin moved, including the discount-heavy Nov-Dec period", "Which products have the highest and lowest margins"],
    sampleNote: SALES_NOTE + " Unit costs are invented sample figures.",
    definitions: ["Cost of Goods Sold (COGS) = quantity × unit cost.", "Gross Profit = revenue − COGS. Operating costs (payroll, rent, marketing) are not included.", "Gross Profit Margin = gross profit ÷ revenue, calculated only over rows that have cost data. Rows without a unit cost are excluded and counted in the note under the KPIs; profit is never guessed.", "Product margin charts include products with at least 5 orders in the selection."],
    prepare: salesPrep, filters: [fDate, fCat, fReg],
    kpis: function (rows) {
      var k = P.salesKpis(rows), note = k.uncostedRows ? k.uncostedRows + " rows have no cost data and are excluded from cost and margin figures." : "All rows include cost data.";
      return [
        { label: "Revenue", value: money(k.revenue), sub: note }, { label: "Cost of Goods Sold", value: money(k.cogs), sub: "Quantity × unit cost" },
        { label: "Gross Profit", value: money(k.profit), sub: "Revenue − COGS" }, { label: "Gross Profit Margin", value: pct(k.margin), sub: "Gross profit ÷ revenue" }
      ];
    },
    charts: [
      { id: "revcost", title: "Revenue versus cost of goods", desc: "Monthly revenue and COGS, same dollar scale.", config: function (rows, ctx, st) {
          var ms = monthsFor(ctx, st);
          return { type: "bar", data: { labels: ms.map(ml), datasets: [{ label: "Revenue", data: P.monthlySeries(rows, ms, function (r) { return r.revenue; }), backgroundColor: PAL[0] }, { label: "COGS", data: P.monthlySeries(rows, ms, function (r) { return r.cogs || 0; }), backgroundColor: PAL[1] }] }, options: moneyY };
        }, summary: function (rows, ctx, st) { var ms = monthsFor(ctx, st); return peak(ms.map(ml), P.monthlySeries(rows, ms, function (r) { return r.revenue; }), money, "revenue"); }, valueFmt: money },
      { id: "margin", title: "Monthly gross margin", desc: "Gross profit ÷ revenue each month.", config: function (rows, ctx, st) {
          var ms = monthsFor(ctx, st), g = U.groupBy(rows, function (r) { return r.month; });
          var vals = ms.map(function (m) { var k = P.salesKpis(g.get(m) || []); return k.margin; });
          return { type: "line", data: { labels: ms.map(ml), datasets: [{ label: "Gross margin", data: vals, borderColor: PAL[2], backgroundColor: PAL[2], spanGaps: true }] }, options: { scales: { y: { beginAtZero: false, ticks: { callback: function (v) { return pct(v, 0); } } } }, plugins: { tooltip: { callbacks: { label: D.tipPct } } } } };
        }, summary: function (rows, ctx, st) { var ms = monthsFor(ctx, st), g = U.groupBy(rows, function (r) { return r.month; }); var vals = ms.map(function (m) { var k = P.salesKpis(g.get(m) || []); return k.margin === null ? 0 : k.margin; }); return peak(ms.map(ml), vals, pct, "margin"); }, valueFmt: function (v) { return v === null ? "n/a" : pct(v); } },
      { id: "catprofit", title: "Gross profit by category", desc: "Dollars of gross profit per category.", crossFilter: { filter: "category" }, config: function (rows) {
          var e = sortedEntries(byKey(rows, function (r) { return r.category; }, function (r) { return r.profit || 0; }), true);
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Gross profit", data: e.map(function (x) { return x[1]; }), backgroundColor: catColors(e.map(function (x) { return x[0]; })) }] }, options: moneyY };
        }, summary: function (rows) { var e = sortedEntries(byKey(rows, function (r) { return r.category; }, function (r) { return r.profit || 0; }), true); return e[0][0] + " earns the most gross profit (" + money(e[0][1]) + ")."; }, valueFmt: money },
      { id: "hi", title: "Highest-margin products", desc: "Top 5 by gross margin (min. 5 orders).", config: function (rows) {
          var l = productMargins(rows).filter(function (p) { return p.orders >= 5 && p.margin !== null; }).sort(function (a, b) { return b.margin - a.margin; }).slice(0, 5);
          return { type: "bar", data: { labels: l.map(function (p) { return p.product; }), datasets: [{ label: "Gross margin", data: l.map(function (p) { return p.margin; }), backgroundColor: PAL[2] }] }, options: { indexAxis: "y", scales: { x: { ticks: { callback: function (v) { return pct(v, 0); } } } }, plugins: { tooltip: { callbacks: { label: D.tipPct } } } } };
        }, summary: function (rows) { var l = productMargins(rows).filter(function (p) { return p.orders >= 5 && p.margin !== null; }).sort(function (a, b) { return b.margin - a.margin; }); return l.length ? l[0].product + " has the highest margin (" + pct(l[0].margin) + ")." : "Not enough orders per product to rank."; }, valueFmt: function (v) { return pct(v); } },
      { id: "lo", title: "Lowest-margin products", desc: "Bottom 5 by gross margin (min. 5 orders).", config: function (rows) {
          var l = productMargins(rows).filter(function (p) { return p.orders >= 5 && p.margin !== null; }).sort(function (a, b) { return a.margin - b.margin; }).slice(0, 5);
          return { type: "bar", data: { labels: l.map(function (p) { return p.product; }), datasets: [{ label: "Gross margin", data: l.map(function (p) { return p.margin; }), backgroundColor: PAL[1] }] }, options: { indexAxis: "y", scales: { x: { ticks: { callback: function (v) { return pct(v, 0); } } } }, plugins: { tooltip: { callbacks: { label: D.tipPct } } } } };
        }, summary: function (rows) { var l = productMargins(rows).filter(function (p) { return p.orders >= 5 && p.margin !== null; }).sort(function (a, b) { return a.margin - b.margin; }); return l.length ? l[0].product + " has the lowest margin (" + pct(l[0].margin) + ")." : "Not enough orders per product to rank."; }, valueFmt: function (v) { return pct(v); } }
    ],
    table: {
      title: "Product profitability", pageSize: 10, sort: { key: "profit", dir: "desc" },
      columns: [{ key: "product", label: "Product" }, { key: "category", label: "Category" }, { key: "units", label: "Units", num: true }, { key: "revenue", label: "Revenue", num: true, fmt: money }, { key: "cogs", label: "COGS", num: true, fmt: money },
        { key: "profit", label: "Gross profit", num: true, fmt: money }, { key: "margin", label: "Margin", num: true, fmt: function (v) { return pct(v); } }],
      rows: function (rows) { return productMargins(rows); }
    }
  });

  /* ======================= 4. Customer Analytics ======================= */
  var VALUE_BUCKETS = [
    { value: "lt100", label: "Under $100" }, { value: "100-299", label: "$100 – $299" }, { value: "300-799", label: "$300 – $799" }, { value: "800+", label: "$800 and above" }
  ];
  function inBucket(v, b) { return b === "All" || (b === "lt100" ? v < 100 : b === "100-299" ? v >= 100 && v < 300 : b === "300-799" ? v >= 300 && v < 800 : v >= 800); }
  function custTable(rows) {
    var out = [];
    P.customerMetrics(rows).byCust.forEach(function (list, id) {
      var spend = U.sum(list, function (r) { return r.revenue; }), dates = list.map(function (r) { return r.date; }).sort();
      out.push({ customer: id, segment: list[0].segment, orders: list.length, spend: spend, aov: spend / list.length, first: dates[0], last: dates[dates.length - 1], status: list.some(function (r) { return r.isFirst; }) ? "New" : "Returning" });
    });
    return out;
  }
  function freqBuckets(rows) {
    var b = [0, 0, 0, 0, 0]; P.customerMetrics(rows).byCust.forEach(function (l) { b[Math.min(l.length, 5) - 1]++; }); return b;
  }
  var SPEND_EDGES = [[0, 100, "Under $100"], [100, 250, "$100–249"], [250, 500, "$250–499"], [500, 1000, "$500–999"], [1000, 2000, "$1,000–1,999"], [2000, 1e12, "$2,000+"]];
  function spendBuckets(rows) {
    var b = SPEND_EDGES.map(function () { return 0; });
    custTable(rows).forEach(function (c) { for (var i = 0; i < SPEND_EDGES.length; i++) if (c.spend >= SPEND_EDGES[i][0] && c.spend < SPEND_EDGES[i][1]) { b[i]++; break; } });
    return b;
  }
  window.IF_DASHBOARDS.push({
    id: "customers", order: 4, title: "Customer Analytics", icon: "users", data: ["sales"], csv: "sales",
    blurb: "New versus returning customers, purchase frequency and spending.",
    tags: ["Customers", "Repeat purchase", "Segments"],
    purpose: "Understand purchasing activity and repeat-customer behaviour using transaction data alone.",
    problem: "Revenue totals do not show whether growth comes from new customers or from people who keep coming back.",
    learn: ["How many active customers are new versus returning each month", "How many customers buy once versus repeatedly", "How spending is distributed across customers"],
    sampleNote: SALES_NOTE + " Customers are synthetic IDs (CU-0001 …); there is no personal or demographic data, and this analysis cannot say why customers buy.",
    definitions: ["A customer is NEW in a selection if their first-ever order in the whole dataset falls inside it; otherwise RETURNING. The dataset starts in January 2025, so every January customer is counted as new (a limitation of the sample window).", "Unique customers = new + returning customers with at least one order in the selection.", "Repeat order share = orders that are not a customer's first-ever order ÷ all orders in the month.", "Average Order Value = revenue ÷ orders in the selection."],
    prepare: salesPrep,
    filters: [fDate, { id: "segment", type: "select", field: "segment", label: "Customer segment", options: function (c) { return c.segments; } },
      { id: "value", type: "select", label: "Order value", options: VALUE_BUCKETS, allLabel: "Any order value", pred: function (r, v) { return inBucket(r.revenue, v); } }],
    kpis: function (rows) {
      var c = P.customerMetrics(rows);
      return [
        { label: "Unique Customers", value: U.int(c.unique) }, { label: "New Customers", value: U.int(c.newCustomers), sub: "First-ever order in selection" },
        { label: "Returning Customers", value: U.int(c.returning), sub: "First order before selection" }, { label: "Average Order Value", value: money(c.aov) }
      ];
    },
    charts: [
      { id: "newret", title: "New versus returning customers", desc: "Distinct active customers per month.", wide: true, config: function (rows, ctx, st) {
          var ms = monthsFor(ctx, st), g = U.groupBy(rows, function (r) { return r.month; });
          var nw = [], rt = [];
          ms.forEach(function (m) { var c = P.customerMetrics(g.get(m) || []); nw.push(c.newCustomers); rt.push(c.returning); });
          return { type: "bar", data: { labels: ms.map(ml), datasets: [{ label: "New customers", data: nw, backgroundColor: PAL[0], borderColor: "#fff", borderWidth: 2 }, { label: "Returning customers", data: rt, backgroundColor: PAL[2], borderColor: "#fff", borderWidth: 2 }] }, options: { scales: { x: { stacked: true }, y: { stacked: true } } } };
        }, summary: function (rows, ctx, st) { var ms = monthsFor(ctx, st), g = U.groupBy(rows, function (r) { return r.month; }); var t = ms.map(function (m) { return P.customerMetrics(g.get(m) || []).unique; }); return peak(ms.map(ml), t, U.int, "active customers"); }, valueFmt: U.int },
      { id: "freq", title: "Purchase frequency", desc: "Customers by number of orders in the selection.", config: function (rows) {
          return { type: "bar", data: { labels: ["1 order", "2 orders", "3 orders", "4 orders", "5+ orders"], datasets: [{ label: "Customers", data: freqBuckets(rows), backgroundColor: PAL[0] }] } };
        }, summary: function (rows) { var b = freqBuckets(rows), t = U.sum(b); return pct(b[0] / t) + " of customers ordered once in this selection."; }, valueFmt: U.int },
      { id: "spend", title: "Customer spending distribution", desc: "Customers by total spend in the selection.", config: function (rows) {
          return { type: "bar", data: { labels: SPEND_EDGES.map(function (e) { return e[2]; }), datasets: [{ label: "Customers", data: spendBuckets(rows), backgroundColor: PAL[2] }] } };
        }, summary: function (rows) { var b = spendBuckets(rows), i = b.indexOf(Math.max.apply(null, b)); return "Most customers fall in the " + SPEND_EDGES[i][2] + " band (" + U.int(b[i]) + " customers)."; }, valueFmt: U.int },
      { id: "repeat", title: "Repeat-purchase trend", desc: "Share of each month's orders that are not a customer's first-ever order.", wide: true, config: function (rows, ctx, st) {
          var ms = monthsFor(ctx, st), g = U.groupBy(rows, function (r) { return r.month; });
          var vals = ms.map(function (m) { var l = g.get(m) || []; return U.div(l.filter(function (r) { return !r.isFirst; }).length, l.length); });
          return { type: "line", data: { labels: ms.map(ml), datasets: [{ label: "Repeat order share", data: vals, borderColor: PAL[1], backgroundColor: PAL[1], spanGaps: true }] }, options: { scales: { y: { max: 1, ticks: { callback: function (v) { return pct(v, 0); } } } }, plugins: { tooltip: { callbacks: { label: D.tipPct } } } } };
        }, summary: function (rows, ctx, st) { var ms = monthsFor(ctx, st), g = U.groupBy(rows, function (r) { return r.month; }); var vals = ms.map(function (m) { var l = g.get(m) || []; return l.length ? l.filter(function (r) { return !r.isFirst; }).length / l.length : 0; }); return peak(ms.map(ml), vals, pct, "repeat share"); }, valueFmt: function (v) { return v === null ? "n/a" : pct(v); } }
    ],
    table: {
      title: "Customers (synthetic IDs)", pageSize: 10, sort: { key: "spend", dir: "desc" },
      columns: [{ key: "customer", label: "Customer ID" }, { key: "segment", label: "Segment" }, { key: "status", label: "In selection" }, { key: "orders", label: "Orders", num: true }, { key: "spend", label: "Total spend", num: true, fmt: money },
        { key: "aov", label: "Avg order", num: true, fmt: money }, { key: "first", label: "First order" }, { key: "last", label: "Last order" }],
      rows: custTable
    }
  });
})();
