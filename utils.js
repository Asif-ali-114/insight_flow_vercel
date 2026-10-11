/* Pure helpers (formatting, aggregation, CSV). Works in the browser (window.IFU) and in Node tests (require). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.IFU = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  var usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var num0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  var num1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function isNum(n) { return typeof n === "number" && isFinite(n); }
  function money(n) { return isNum(n) ? usd0.format(n) : "n/a"; }
  function money2(n) { return isNum(n) ? usd2.format(n) : "n/a"; }
  function compactMoney(n) {
    if (!isNum(n)) return "n/a";
    var a = Math.abs(n), s = n < 0 ? "-" : "";
    if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
    if (a >= 1e3) return s + "$" + (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
    return s + "$" + Math.round(a);
  }
  function int(n) { return isNum(n) ? num0.format(n) : "n/a"; }
  function dec1(n) { return isNum(n) ? num1.format(n) : "n/a"; }
  /** fraction -> "12.3%" ; null/NaN -> "n/a" */
  function pct(n, d) {
    if (!isNum(n)) return "n/a";
    return (n * 100).toFixed(d == null ? 1 : d) + "%";
  }
  /** safe division: returns null when denominator is 0/missing. */
  function div(a, b) { return isNum(a) && isNum(b) && b !== 0 ? a / b : null; }
  /** Percentage change as a fraction. Returns null when the baseline is 0, missing or non-finite
      (no "Infinity%" and no misleading growth from a zero baseline). */
  function pctChange(cur, prev) {
    if (!isNum(cur) || !isNum(prev) || prev === 0) return null;
    return (cur - prev) / Math.abs(prev);
  }
  function signedPct(f, d) {
    if (f === null || f === undefined || !isFinite(f)) return "n/a";
    return (f > 0 ? "+" : "") + (f * 100).toFixed(d == null ? 1 : d) + "%";
  }
  function sum(arr, fn) { var t = 0; for (var i = 0; i < arr.length; i++) t += fn ? fn(arr[i]) : arr[i]; return t; }
  function groupBy(rows, keyFn) {
    var m = new Map();
    rows.forEach(function (r) { var k = keyFn(r); var a = m.get(k); if (a) a.push(r); else m.set(k, [r]); });
    return m;
  }
  function uniq(arr) { return Array.from(new Set(arr)); }
  function sortedUniq(arr) { return uniq(arr).sort(); }
  function monthLabel(ym, withYear) {
    var p = String(ym).split("-"); var m = MONTHS[parseInt(p[1], 10) - 1];
    return withYear ? m + " " + p[0] : m;
  }
  function csvEscape(v) {
    if (v === null || v === undefined) return "";
    var s = String(v);
    // Neutralise spreadsheet formula injection for text cells that start with = + - @ (but keep plain negative numbers)
    if (typeof v === "string" && /^[=+@]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  /** columns: [{key,label}] ; rows: array of objects */
  function toCsv(columns, rows) {
    var head = columns.map(function (c) { return csvEscape(c.label || c.key); }).join(",");
    var body = rows.map(function (r) { return columns.map(function (c) { return csvEscape(r[c.key]); }).join(","); });
    return [head].concat(body).join("\r\n") + "\r\n";
  }
  function downloadText(filename, text, mime) {
    var blob = new Blob(["﻿" + text], { type: (mime || "text/csv") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  function round2(n) { return Math.round(n * 100) / 100; }
  function ymOf(iso) { return String(iso).slice(0, 7); }

  return {
    money: money, money2: money2, compactMoney: compactMoney, int: int, dec1: dec1, pct: pct, div: div,
    pctChange: pctChange, signedPct: signedPct, sum: sum, groupBy: groupBy, uniq: uniq, sortedUniq: sortedUniq,
    monthLabel: monthLabel, csvEscape: csvEscape, toCsv: toCsv, downloadText: downloadText, isNum: isNum,
    round2: round2, ymOf: ymOf, MONTHS: MONTHS
  };
});
