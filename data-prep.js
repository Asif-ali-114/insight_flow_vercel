/* Dataset preparation + KPI calculators shared by dashboards, the home page, case studies,
   the sample report and the Node tests. Pure functions only. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./utils.js"));
  else root.IFP = factory(root.IFU);
})(typeof self !== "undefined" ? self : this, function (U) {
  "use strict";

  /** Expand the compact sales dataset into row objects with derived money fields.
      Rows missing a unit cost keep cogs/profit = null and are excluded from margin maths. */
  function prepareSales(raw) {
    var products = raw.products;
    var segByCust = {};
    raw.customers.forEach(function (c) { segByCust[c[0]] = c[1]; });
    var rows = raw.rows.map(function (r) {
      var p = products[r[3]];
      var qty = r[5], disc = r[6];
      var revenue = U.round2(qty * p.price * (1 - disc));
      var hasCost = typeof p.cost === "number";
      var cogs = hasCost ? U.round2(qty * p.cost) : null;
      return {
        id: r[0], date: r[1], month: r[1].slice(0, 7), cust: r[2], segment: segByCust[r[2]],
        productId: p.id, product: p.name, category: p.category, region: r[4], qty: qty, disc: disc,
        price: p.price, cost: hasCost ? p.cost : null, revenue: revenue, cogs: cogs,
        profit: hasCost ? U.round2(revenue - cogs) : null, isFirst: false
      };
    });
    // first-ever order per customer (ties on date broken by order id) -> new vs returning
    var first = {};
    rows.forEach(function (r) {
      var f = first[r.cust];
      if (!f || r.date < f.date || (r.date === f.date && r.id < f.id)) first[r.cust] = r;
    });
    Object.keys(first).forEach(function (k) { first[k].isFirst = true; });
    var dates = rows.map(function (r) { return r.date; }).sort();
    return {
      rows: rows, products: products, categories: raw.categories, regions: raw.regions, segments: raw.segments,
      minDate: dates[0], maxDate: dates[dates.length - 1], months: U.sortedUniq(rows.map(function (r) { return r.month; }))
    };
  }

  /** Core sales KPIs for any row set. Margin figures use only rows with cost data. */
  function salesKpis(rows) {
    var revenue = U.sum(rows, function (r) { return r.revenue; });
    var costed = rows.filter(function (r) { return r.cogs !== null; });
    var costedRevenue = U.sum(costed, function (r) { return r.revenue; });
    var cogs = U.sum(costed, function (r) { return r.cogs; });
    var profit = costed.length ? costedRevenue - cogs : null;
    return {
      revenue: revenue, orders: rows.length, units: U.sum(rows, function (r) { return r.qty; }),
      aov: U.div(revenue, rows.length),
      cogs: costed.length ? cogs : null, profit: profit, margin: U.div(profit, costedRevenue),
      uncostedRows: rows.length - costed.length
    };
  }

  /** Revenue grouped by month for an ordered list of months (0 for months with no rows). */
  function monthlySeries(rows, months, valueFn) {
    var m = U.groupBy(rows, function (r) { return r.month; });
    return months.map(function (k) { return U.sum(m.get(k) || [], valueFn); });
  }

  /** Customer metrics for a row set. New = customer whose first-ever order is in this row set. */
  function customerMetrics(rows) {
    var byCust = U.groupBy(rows, function (r) { return r.cust; });
    var newC = 0, ret = 0;
    byCust.forEach(function (list) {
      if (list.some(function (r) { return r.isFirst; })) newC++; else ret++;
    });
    return { unique: byCust.size, newCustomers: newC, returning: ret, aov: U.div(U.sum(rows, function (r) { return r.revenue; }), rows.length), byCust: byCust };
  }

  return { prepareSales: prepareSales, salesKpis: salesKpis, monthlySeries: monthlySeries, customerMetrics: customerMetrics };
});
