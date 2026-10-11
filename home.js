/* Home page: hero preview + working sample dashboard, both computed from data/sales.js. */
(function () {
  "use strict";
  var U = window.IFU, P = window.IFP, D = window.IFDash, H = window.IFDH, esc = window.IF_ESC;
  var PAL = D.PALETTE, money = U.money;

  /* ---- working sample dashboard (same engine as the dashboards page) ---- */
  var def = {
    id: "home", title: "Sample sales dashboard", data: ["sales"], csv: "sales",
    purpose: "A small working dashboard on synthetic retail sales. Change the dates or category and everything updates together.",
    problem: "Seeing revenue, orders and top products in one place instead of across spreadsheets.",
    learn: ["How revenue moves over the year", "Which products lead in the selection", "How categories share revenue (click a segment to filter)"],
    sampleNote: "Synthetic sample data (about 3,300 orders, 2025). Not connected to any real company, store or payment platform.",
    definitions: ["Revenue = quantity × unit price × (1 − discount).", "Average order value = revenue ÷ orders.", "Revenue growth = last month in the selected dates versus the month before; n/a if there is no usable baseline."],
    prepare: H.salesPrep, filters: [H.fDate, H.fCat],
    kpis: function (rows, ctx, st) {
      var k = P.salesKpis(rows), g = H.growth(rows, ctx, st);
      return [{ label: "Total Revenue", value: money(k.revenue) }, { label: "Total Orders", value: U.int(k.orders) }, { label: "Average Order Value", value: money(k.aov) },
        { label: "Revenue Growth", value: g === null ? "n/a" : U.signedPct(g), sub: "Last month vs previous month", delta: g, deltaNA: "Needs two months with a non-zero baseline" }];
    },
    charts: [
      { id: "trend", title: "Revenue over time", desc: "Monthly revenue (daily for ranges up to 62 days).", wide: true, config: function (rows, ctx, st) {
          var s = H.periodSeries(rows, ctx, st, function (r) { return r.revenue; });
          return { type: "line", data: { labels: s.labels, datasets: [{ label: "Revenue", data: s.values, borderColor: PAL[0], backgroundColor: "rgba(42,120,214,.12)", fill: true }] }, options: H.moneyY };
        }, summary: function (rows, ctx, st) { var s = H.periodSeries(rows, ctx, st, function (r) { return r.revenue; }); return H.peak(s.labels, s.values, money, "revenue"); }, valueFmt: money },
      { id: "top", title: "Product performance", desc: "Top 8 products by revenue.", config: function (rows) {
          var e = H.sortedEntries(H.byKey(rows, function (r) { return r.product; }, function (r) { return r.revenue; }), true).slice(0, 8);
          return { type: "bar", data: { labels: e.map(function (x) { return x[0]; }), datasets: [{ label: "Revenue", data: e.map(function (x) { return x[1]; }), backgroundColor: PAL[0] }] }, options: H.moneyX };
        }, summary: function (rows) { var e = H.sortedEntries(H.byKey(rows, function (r) { return r.product; }, function (r) { return r.revenue; }), true); return e[0][0] + " leads with " + money(e[0][1]) + "."; }, valueFmt: money },
      { id: "cat", title: "Category breakdown", desc: "Share of revenue by category.", crossFilter: { filter: "category" }, config: function (rows) {
          var e = H.sortedEntries(H.byKey(rows, function (r) { return r.category; }, function (r) { return r.revenue; }), true);
          return H.doughnut(e, H.catColors(e.map(function (x) { return x[0]; })), money);
        }, summary: function (rows) { var e = H.sortedEntries(H.byKey(rows, function (r) { return r.category; }, function (r) { return r.revenue; }), true); return e.map(function (x) { return x[0] + " " + money(x[1]); }).join("; ") + "."; }, valueFmt: money }
    ],
    export: { columns: H.orderCols.map(function (c) { return { key: c.key, label: c.label }; }), rows: H.orderRows }
  };
  var mountEl = document.getElementById("home-dash");
  if (mountEl) D.mount(mountEl, def);

  /* ---- hero preview ---- */
  var hero = document.getElementById("hero-preview");
  if (!hero) return;
  D.loadData(["sales"]).then(function () {
    var ctx = P.prepareSales(window.IF_DATA.sales), k = P.salesKpis(ctx.rows);
    var rev = P.monthlySeries(ctx.rows, ctx.months, function (r) { return r.revenue; });
    var prof = P.monthlySeries(ctx.rows, ctx.months, function (r) { return r.profit || 0; });
    var cat = H.sortedEntries(H.byKey(ctx.rows, function (r) { return r.category; }, function (r) { return r.revenue; }), true);
    var last = U.pctChange(rev[rev.length - 1], rev[rev.length - 2]);
    hero.innerHTML =
      '<div class="hp-card" role="group" aria-label="Sample analytics dashboard preview"><div class="hp-head"><strong>Business overview</strong><span class="pill teal">Sample data</span></div>' +
      '<div class="hp-kpis"><div><span>Revenue</span><b>' + money(k.revenue) + "</b></div><div><span>Gross margin</span><b>" + U.pct(k.margin) + "</b></div><div><span>Orders</span><b>" + U.int(k.orders) + "</b></div><div><span>Dec vs Nov</span><b>" + U.signedPct(last) + "</b></div></div>" +
      '<div class="hp-chart"><canvas id="hp-line" role="img" aria-label="Monthly revenue and gross profit for 2025, sample data. Revenue rose from ' + money(rev[0]) + " in January to " + money(rev[rev.length - 1]) + ' in December."></canvas></div>' +
      '<div class="hp-cats">' + cat.slice(0, 4).map(function (c) { return '<div><i style="background:' + D.CAT_COLORS[c[0]] + '"></i><span>' + esc(c[0]) + "</span><b>" + U.pct(c[1] / k.revenue, 0) + "</b></div>"; }).join("") + "</div></div>";
    new Chart(document.getElementById("hp-line"), { type: "line", data: { labels: ctx.months.map(function (m) { return U.monthLabel(m); }), datasets: [
      { label: "Revenue", data: rev, borderColor: PAL[0], backgroundColor: "rgba(42,120,214,.12)", fill: true, borderWidth: 2, pointRadius: 0, tension: .25 },
      { label: "Gross profit", data: prof, borderColor: PAL[2], borderWidth: 2, pointRadius: 0, tension: .25 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, color: D.INK } }, tooltip: { backgroundColor: D.NAVY, callbacks: { label: D.tipMoney } } },
        scales: { x: { grid: { display: false }, ticks: { color: D.INK, maxTicksLimit: 6 } }, y: { beginAtZero: true, grid: { color: D.GRID }, border: { display: false }, ticks: { color: D.INK, callback: D.moneyTick, maxTicksLimit: 4 } } } } });
  });
})();
