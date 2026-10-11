/* Case-study previews (case-studies.html). Every number is computed from the synthetic sample datasets,
   so the findings can never drift from the data. All case studies are illustrations, not client work. */
(function () {
  "use strict";
  var U = window.IFU, P = window.IFP, D = window.IFDash, esc = window.IF_ESC, PAL = D.PALETTE;
  var defs = {}; (window.IF_DASHBOARDS || []).forEach(function (d) { defs[d.id] = d; });
  var ids = ["sales", "web", "quality", "inventory", "finance", "education"];
  var money = U.money, pct = U.pct;

  D.loadData(["sales", "web", "quality", "inventory", "expenses", "students"]).then(run, function (e) {
    document.querySelectorAll("[data-case-preview]").forEach(function (n) { n.innerHTML = '<div class="error-box" role="alert">Sample data could not be loaded: ' + esc(e.message) + "</div>"; });
  });

  function groupSum(rows, kf, vf) { var m = new Map(); rows.forEach(function (r) { var k = kf(r); m.set(k, (m.get(k) || 0) + vf(r)); }); return m; }
  function sorted(m, desc) { return Array.from(m.entries()).sort(function (a, b) { return desc === false ? a[1] - b[1] : b[1] - a[1]; }); }
  var F = {}, charts = {};
  function setAll() { Object.keys(F).forEach(function (k) { document.querySelectorAll('[data-f="' + k + '"]').forEach(function (n) { n.textContent = F[k]; }); }); }
  var base = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: D.NAVY, padding: 10 } } };
  var gx = { grid: { display: false }, ticks: { color: D.INK } };
  function gy(cb) { return { beginAtZero: true, grid: { color: D.GRID }, border: { display: false }, ticks: { color: D.INK, callback: cb } }; }
  function draw(id, cfg, summary) {
    var el = document.getElementById(id); if (!el) return;
    var user = (cfg.options && cfg.options.plugins) || {};
    var multi = cfg.data.datasets.length > 1;
    cfg.options = Object.assign({}, base, cfg.options || {});
    cfg.options.plugins = {
      legend: multi ? { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, color: D.INK } } : { display: false },
      tooltip: Object.assign({}, base.plugins.tooltip, user.tooltip || {})
    };
    el.setAttribute("aria-label", summary); charts[id] = new Chart(el, cfg);
    var s = document.querySelector('[data-sum="' + id + '"]'); if (s) s.textContent = summary;
  }

  function run() {
    var raw = window.IF_DATA;
    /* 1 retail */
    var s = defs.sales.prepare(raw), rows = s.rows.filter(function (r) { return r.month <= "2025-06"; }), months = s.months.filter(function (m) { return m <= "2025-06"; });
    var k = P.salesKpis(rows), mr = P.monthlySeries(rows, months, function (r) { return r.revenue; });
    var qg = U.pctChange(U.sum(mr.slice(3)), U.sum(mr.slice(0, 3)));
    var cats = sorted(groupSum(rows, function (r) { return r.category; }, function (r) { return r.revenue; }));
    var q = function (ms) { return groupSum(rows.filter(function (r) { return ms.indexOf(r.month) !== -1; }), function (r) { return r.product; }, function (r) { return r.revenue; }); };
    var p1 = q(months.slice(0, 3)), p2 = q(months.slice(3)), dec = 0, tot = 0; p1.forEach(function (v, n) { tot++; if ((p2.get(n) || 0) < v) dec++; });
    F.retailRev = money(k.revenue); F.retailQ = U.signedPct(qg); F.retailCat = cats[0][0]; F.retailCatShare = pct(cats[0][1] / k.revenue); F.retailDec = dec + " of " + tot; F.retailMargin = pct(k.margin);
    draw("cs-retail", { type: "bar", data: { labels: months.map(function (m) { return U.monthLabel(m); }), datasets: [{ label: "Revenue", data: mr, backgroundColor: PAL[0], borderRadius: 4 }] }, options: { scales: { x: gx, y: gy(D.moneyTick) }, plugins: { tooltip: { callbacks: { label: D.tipMoney } } } } },
      "Monthly revenue January to June: from " + money(mr[0]) + " to " + money(mr[mr.length - 1]) + ".");

    /* 2 e-commerce / web */
    var w = defs.web.prepare(raw).rows, ws = U.sum(w, function (r) { return r.sessions; }), wc = U.sum(w, function (r) { return r.conversions; });
    var bySrc = U.groupBy(w, function (r) { return r.source; }), srcRates = [];
    bySrc.forEach(function (l, name) { srcRates.push([name, U.sum(l, function (r) { return r.conversions; }) / U.sum(l, function (r) { return r.sessions; }), U.sum(l, function (r) { return r.sessions; })]); });
    srcRates.sort(function (a, b) { return b[1] - a[1]; });
    var topSess = srcRates.slice().sort(function (a, b) { return b[2] - a[2]; })[0];
    F.webSessions = U.int(ws); F.webRate = pct(wc / ws, 2); F.webBest = srcRates[0][0]; F.webBestRate = pct(srcRates[0][1], 2); F.webTop = topSess[0]; F.webTopShare = pct(topSess[2] / ws);
    draw("cs-web", { type: "bar", data: { labels: srcRates.map(function (x) { return x[0]; }), datasets: [{ label: "Conversion rate", data: srcRates.map(function (x) { return x[1]; }), backgroundColor: PAL[2], borderRadius: 4 }] }, options: { indexAxis: "y", scales: { x: Object.assign({}, gy(function (v) { return pct(v, 1); })), y: gx }, plugins: { tooltip: { callbacks: { label: function (c) { return " " + pct(c.parsed.x, 2); } } } } } },
      "Conversion rate by traffic source; " + srcRates[0][0] + " is highest at " + pct(srcRates[0][1], 2) + ".");

    /* 3 data quality */
    var qc = defs.quality.prepare(raw), qs = qc.result.summary, recs = qc.result.records;
    var kept = recs.filter(function (r) { return r.status !== "removed"; });
    var beforeCounts = [qs.byKind.duplicate, recs.filter(function (r) { return r.issues.some(function (i) { return i.kind === "missing"; }); }).length, qs.invalidRecords, qs.formatIssueRecords];
    var afterCounts = [0, kept.filter(function (r) { return r.issues.some(function (i) { return i.kind === "missing"; }); }).length, kept.filter(function (r) { return r.status === "flagged"; }).length, 0];
    F.qRows = U.int(qs.total); F.qDup = U.int(qs.byKind.duplicate); F.qFmt = U.int(qs.formatIssueRecords); F.qMissing = U.int(qs.missingCells); F.qFlag = U.int(qs.flagged); F.qCompB = pct(qs.completenessBefore); F.qCompA = pct(qs.completenessAfter);
    draw("cs-quality", { type: "bar", data: { labels: ["Extra duplicate rows", "Records with missing values", "Records breaking a rule", "Records with formatting issues"], datasets: [{ label: "Before", data: beforeCounts, backgroundColor: PAL[1], borderRadius: 4 }, { label: "After", data: afterCounts, backgroundColor: PAL[0], borderRadius: 4 }] }, options: { scales: { x: { grid: { display: false }, ticks: { color: D.INK, maxRotation: 0 } }, y: gy() } } },
      "Duplicates and formatting issues fall to zero after cleaning; missing and rule-breaking records remain because they are flagged, not guessed.");

    /* 4 inventory */
    var inv = defs.inventory.prepare(raw).rows, out = inv.filter(function (r) { return r.status === "Out of stock"; }), low = inv.filter(function (r) { return r.status === "Low stock"; }), near = inv.slice().sort(function (a, b) { return a.ratio - b.ratio; });
    F.invOut = U.int(out.length); F.invLow = U.int(low.length); F.invValue = money(U.sum(inv, function (r) { return r.value; })); F.invNear = near[0].product; F.invTotal = U.int(inv.length);
    var stat = ["In stock", "Low stock", "Out of stock"].map(function (n) { return inv.filter(function (r) { return r.status === n; }).length; });
    draw("cs-inventory", { type: "bar", data: { labels: ["In stock", "Low stock", "Out of stock"], datasets: [{ label: "Products", data: stat, backgroundColor: [PAL[2], PAL[3], PAL[1]], borderRadius: 4 }] }, options: { scales: { x: gx, y: gy() } } },
      stat[0] + " products in stock, " + stat[1] + " low, " + stat[2] + " out of stock.");

    /* 5 finance */
    var fc = defs.finance.prepare(raw), em = groupSum(fc.rows, function (r) { return r.month; }, function (r) { return r.actual; });
    var net = fc.months.map(function (m) { return (fc.income.get(m) || 0) - (em.get(m) || 0); }), neg = net.filter(function (x) { return x < 0; }).length;
    var ecat = sorted(groupSum(fc.rows, function (r) { return r.category; }, function (r) { return r.actual; })), totalExp = U.sum(fc.rows, function (r) { return r.actual; }), totalBud = U.sum(fc.rows, function (r) { return r.budget; });
    var totalInc = U.sum(fc.months, function (m) { return fc.income.get(m) || 0; });
    F.finInc = money(totalInc); F.finExp = money(totalExp); F.finNet = money(totalInc - totalExp); F.finNeg = neg + " of " + fc.months.length; F.finCat = ecat[0][0]; F.finCatShare = pct(ecat[0][1] / totalExp); F.finBud = totalExp > totalBud ? money(totalExp - totalBud) + " over budget" : money(totalBud - totalExp) + " under budget";
    draw("cs-finance", { type: "bar", data: { labels: fc.months.map(function (m) { return U.monthLabel(m); }), datasets: [{ label: "Income", data: fc.months.map(function (m) { return fc.income.get(m) || 0; }), backgroundColor: PAL[0], borderRadius: 4 }, { label: "Expenses", data: fc.months.map(function (m) { return em.get(m) || 0; }), backgroundColor: PAL[1], borderRadius: 4 }] }, options: { scales: { x: gx, y: gy(D.moneyTick) }, plugins: { tooltip: { callbacks: { label: D.tipMoney } } } } },
      "Monthly income and expenses; income exceeded expenses in " + (fc.months.length - neg) + " of " + fc.months.length + " months.");

    /* 6 education (aggregates only) */
    var ed = defs.education.prepare(raw), er = ed.rows, avg = function (l) { return U.sum(l, function (r) { return r.marks; }) / l.length; };
    var bySub = U.groupBy(er, function (r) { return r.subject; }), subs = [];
    bySub.forEach(function (l, n) { subs.push([n, avg(l)]); }); subs.sort(function (a, b) { return b[1] - a[1]; });
    var hiAtt = er.filter(function (r) { return r.att >= 90; }), loAtt = er.filter(function (r) { return r.att < 70; });
    F.eduN = U.int(U.uniq(er.map(function (r) { return r.student; })).length); F.eduAvg = U.dec1(avg(er)); F.eduPass = pct(er.filter(function (r) { return r.marks >= ed.pass; }).length / er.length);
    F.eduTop = subs[0][0] + " (" + U.dec1(subs[0][1]) + ")"; F.eduLow = subs[subs.length - 1][0] + " (" + U.dec1(subs[subs.length - 1][1]) + ")";
    F.eduAtt = hiAtt.length >= 10 && loAtt.length >= 10 ? "Average marks were " + U.dec1(avg(hiAtt)) + " for results with 90%+ attendance versus " + U.dec1(avg(loAtt)) + " below 70% attendance" : "Not enough records per attendance band to compare";
    draw("cs-edu", { type: "bar", data: { labels: subs.map(function (x) { return x[0]; }), datasets: [{ label: "Average marks", data: subs.map(function (x) { return x[1]; }), backgroundColor: PAL[0], borderRadius: 4 }] }, options: { scales: { x: gx, y: Object.assign(gy(), { max: 100 }) } } },
      "Average marks by subject, from " + U.dec1(subs[subs.length - 1][1]) + " to " + U.dec1(subs[0][1]) + ". Aggregates only; no individual students shown.");
    setAll();
    document.body.setAttribute("data-cases-ready", "1");
  }
})();
