/* Rule-based data cleaning + validation engine used by the cleaning demo and the Data Quality dashboard.
   Principles: standardize formatting that is safe to standardize, remove only EXACT duplicates under an explicit
   rule, and never invent values: missing or invalid values are kept as-is and flagged for human review. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.IFClean = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var KIND = { MISSING: "missing", INVALID: "invalid", FORMAT: "formatting", DUP: "duplicate" };

  function isBlank(v) { return v === null || v === undefined || String(v).trim() === ""; }
  function collapse(s) { return String(s).replace(/\s+/g, " ").trim(); }

  function realDate(y, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  function iso(y, m, d) { return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }

  /** Parse a date under an EXPLICIT convention. Slash dates with day first (dd/mm/yyyy) by default.
      Returns {status:'ok'|'missing'|'invalid', iso, format:'iso'|'ymd-slash'|'dmy-slash'|'mdy-slash'} */
  function parseDate(raw, convention) {
    if (isBlank(raw)) return { status: "missing" };
    var s = collapse(raw), m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) return realDate(+m[1], +m[2], +m[3]) ? { status: "ok", iso: iso(+m[1], +m[2], +m[3]), format: "iso", canonical: /^\d{4}-\d{2}-\d{2}$/.test(s) } : { status: "invalid" };
    if ((m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s))) return realDate(+m[1], +m[2], +m[3]) ? { status: "ok", iso: iso(+m[1], +m[2], +m[3]), format: "ymd-slash", canonical: false } : { status: "invalid" };
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) {
      var day = convention === "mdy" ? +m[2] : +m[1], mon = convention === "mdy" ? +m[1] : +m[2];
      return realDate(+m[3], mon, day) ? { status: "ok", iso: iso(+m[3], mon, day), format: convention === "mdy" ? "mdy-slash" : "dmy-slash", canonical: false } : { status: "invalid" };
    }
    return { status: "invalid" };
  }

  /** Parse money-like text: "$1,200.00", "1,200 USD", "15" -> number. */
  function parseMoney(raw) {
    if (typeof raw === "number") return isFinite(raw) ? { status: "ok", value: raw, canonical: true } : { status: "invalid" };
    if (isBlank(raw)) return { status: "missing" };
    var s = collapse(raw);
    var stripped = s.replace(/^\$\s?/, "").replace(/\s?(USD|usd|\$)$/, "").replace(/,/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(stripped)) return { status: "invalid" };
    var v = parseFloat(stripped);
    return { status: "ok", value: v, canonical: /^-?\d+(\.\d+)?$/.test(s) };
  }

  function titleCase(s) {
    return collapse(s).split(" ").map(function (w) {
      if (/\d/.test(w)) return w;                       // keep tokens such as "14" or "27-inch" as typed
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(" ");
  }
  function canonicalName(raw, canonicalList) {
    var c = collapse(raw);
    if (canonicalList) {
      for (var i = 0; i < canonicalList.length; i++) if (canonicalList[i].toLowerCase() === c.toLowerCase()) return canonicalList[i];
    }
    return titleCase(c);
  }

  /**
   * processRows(rows, options)
   *   rows: array of objects with keys orderId, product, orderDate, quantity, unitPrice (+ optional region, customerId ...)
   *   options: { dateConvention:'dmy'|'mdy', allowedRegions:[...]|null, canonicalProducts:[...]|null, requiredFields:[...] }
   * Returns { records, summary }.
   */
  function processRows(rows, options) {
    var opt = options || {};
    var conv = opt.dateConvention || "dmy";
    var required = opt.requiredFields || ["product", "orderDate", "quantity", "unitPrice"];
    var regions = opt.allowedRegions || null;
    var seen = {};
    var records = rows.map(function (raw, idx) {
      var issues = [], clean = {}, key;
      function add(field, code, kind, message, treatment) { issues.push({ field: field, code: code, kind: kind, message: message, treatment: treatment }); }
      Object.keys(raw).forEach(function (k) { clean[k] = raw[k]; });

      // --- product
      var p = raw.product;
      if (isBlank(p)) { clean.product = ""; add("product", "product_missing", KIND.MISSING, "Product name is missing", "Left blank and flagged for review (not guessed)"); }
      else {
        var cp = canonicalName(p, opt.canonicalProducts);
        if (String(p) !== collapse(p)) add("product", "whitespace", KIND.FORMAT, "Extra whitespace around product name", "Trimmed");
        if (collapse(p) !== cp) add("product", "case", KIND.FORMAT, "Inconsistent capitalization (" + collapse(p) + ")", "Standardized to " + cp);
        clean.product = cp;
      }
      // --- date
      var d = parseDate(raw.orderDate, conv);
      if (d.status === "missing") { clean.orderDate = ""; add("orderDate", "date_missing", KIND.MISSING, "Order date is missing", "Left blank and flagged for review"); }
      else if (d.status === "invalid") { add("orderDate", "date_invalid", KIND.INVALID, "Date \"" + raw.orderDate + "\" is not a real calendar date under the stated convention", "Value kept as entered and flagged for review"); }
      else {
        clean.orderDate = d.iso;
        if (d.format !== "iso" || d.canonical === false) add("orderDate", "date_format", KIND.FORMAT, "Date written as " + collapse(raw.orderDate) + " (" + (d.format === "dmy-slash" ? "day/month/year" : d.format === "mdy-slash" ? "month/day/year" : "year/month/day") + ")", "Converted to yyyy-mm-dd");
      }
      // --- quantity
      var q = raw.quantity;
      if (isBlank(q)) { clean.quantity = ""; add("quantity", "qty_missing", KIND.MISSING, "Quantity is missing", "Left blank and flagged for review"); }
      else {
        var qn = Number(String(q).trim());
        if (!isFinite(qn)) add("quantity", "qty_invalid", KIND.INVALID, "Quantity \"" + q + "\" is not a number", "Value kept and flagged for review");
        else if (!Number.isInteger(qn)) add("quantity", "qty_whole", KIND.INVALID, "Quantity " + qn + " is not a whole number", "Value kept and flagged for review");
        else if (qn < 0) add("quantity", "qty_negative", KIND.INVALID, "Negative quantity (" + qn + ") - may be a return", "Not changed; flagged so the business can confirm whether it is a return");
        else if (qn === 0) add("quantity", "qty_zero", KIND.INVALID, "Quantity is zero", "Value kept and flagged for review");
        clean.quantity = isFinite(qn) ? qn : q;
      }
      // --- unit price
      var m = parseMoney(raw.unitPrice);
      if (m.status === "missing") { clean.unitPrice = ""; add("unitPrice", "price_missing", KIND.MISSING, "Unit price is missing", "Left blank and flagged for review (no zero or average filled in)"); }
      else if (m.status === "invalid" || m.value < 0) add("unitPrice", "price_invalid", KIND.INVALID, "Unit price \"" + raw.unitPrice + "\" is not a valid non-negative amount", "Value kept and flagged for review");
      else { clean.unitPrice = m.value; if (!m.canonical) add("unitPrice", "price_format", KIND.FORMAT, "Currency formatting in \"" + collapse(raw.unitPrice) + "\"", "Converted to a plain number"); }
      // --- region (optional)
      if (regions) {
        var rg = raw.region;
        if (isBlank(rg)) { clean.region = ""; add("region", "region_missing", KIND.MISSING, "Region is missing", "Left blank and flagged for review"); }
        else {
          var crg = null;
          regions.forEach(function (x) { if (x.toLowerCase() === collapse(rg).toLowerCase()) crg = x; });
          if (!crg) add("region", "region_invalid", KIND.INVALID, "Region \"" + collapse(rg) + "\" is not in the allowed list", "Value kept and flagged for review");
          else {
            if (String(rg) !== collapse(rg)) add("region", "whitespace", KIND.FORMAT, "Extra whitespace around region", "Trimmed");
            if (collapse(rg) !== crg) add("region", "case", KIND.FORMAT, "Inconsistent capitalization (" + collapse(rg) + ")", "Standardized to " + crg);
            clean.region = crg;
          }
        }
      }
      // --- exact duplicate rule: same Order ID + product + date + quantity + unit price after standardizing
      var status = "ok", dupOf = null;
      key = [collapse(raw.orderId || ""), clean.product, clean.orderDate, clean.quantity, clean.unitPrice].join("|");
      var hardIssue = issues.some(function (i) { return i.kind === KIND.INVALID && (i.field === "orderDate"); });
      if (!hardIssue && !isBlank(raw.orderId)) {
        if (seen[key] !== undefined) {
          dupOf = seen[key];
          add("orderId", "duplicate", KIND.DUP, "Exact duplicate of row " + (dupOf + 1) + " (same order ID, product, date, quantity and price)", "Removed; the first occurrence is kept");
          status = "removed";
        } else seen[key] = idx;
      }
      if (status !== "removed") {
        var needsReview = issues.some(function (i) { return i.kind === KIND.MISSING || i.kind === KIND.INVALID; });
        var fixed = issues.some(function (i) { return i.kind === KIND.FORMAT; });
        status = needsReview ? "flagged" : fixed ? "fixed" : "ok";
      }
      return { index: idx, raw: raw, clean: clean, issues: issues, status: status, dupOf: dupOf };
    });
    return { records: records, summary: summarize(records, required, regions) };
  }

  function summarize(records, required, regions) {
    var req = required.slice(); if (regions && req.indexOf("region") === -1) req.push("region");
    var s = { total: records.length, retained: 0, removed: 0, ok: 0, fixed: 0, flagged: 0, byCode: {}, byKind: { missing: 0, invalid: 0, formatting: 0, duplicate: 0 },
      missingCells: 0, missingByField: {}, invalidRecords: 0, formatIssueRecords: 0, requiredFields: req };
    req.forEach(function (f) { s.missingByField[f] = 0; });
    records.forEach(function (r) {
      if (r.status === "removed") s.removed++; else { s.retained++; s[r.status]++; }
      var hasInvalid = false, hasFormat = false;
      r.issues.forEach(function (i) {
        s.byCode[i.code] = (s.byCode[i.code] || 0) + 1;
        if (i.kind === KIND.MISSING) { s.byKind.missing++; s.missingCells++; if (s.missingByField[i.field] !== undefined) s.missingByField[i.field]++; }
        else if (i.kind === KIND.INVALID) { s.byKind.invalid++; hasInvalid = true; }
        else if (i.kind === KIND.FORMAT) { s.byKind.formatting++; hasFormat = true; }
        else if (i.kind === KIND.DUP) s.byKind.duplicate++;
      });
      if (hasInvalid || r.issues.some(function (i) { return i.kind === KIND.MISSING; })) s.invalidRecords++;   // violates >= 1 explicit validation rule
      if (hasFormat) s.formatIssueRecords++;
    });
    var cells = s.total * req.length;
    s.completenessBefore = cells ? 1 - s.missingCells / cells : null;
    // After cleaning: duplicates are removed; missing values are NOT filled, so only the denominator changes.
    var missingAfter = 0;
    records.forEach(function (r) { if (r.status !== "removed") r.issues.forEach(function (i) { if (i.kind === KIND.MISSING) missingAfter++; }); });
    s.missingCellsAfter = missingAfter;
    var cellsAfter = s.retained * req.length;
    s.completenessAfter = cellsAfter ? 1 - missingAfter / cellsAfter : null;
    s.reviewRecords = s.flagged;
    return s;
  }

  /** Cleaned dataset: retained rows only, with review columns. Duplicates are excluded (documented in the report). */
  function cleanedRows(result) {
    return result.records.filter(function (r) { return r.status !== "removed"; }).map(function (r) {
      var out = Object.assign({}, r.clean);
      var rev = r.issues.filter(function (i) { return i.kind === KIND.MISSING || i.kind === KIND.INVALID; });
      out.reviewStatus = rev.length ? "Needs review" : "OK";
      out.reviewNotes = rev.map(function (i) { return i.message; }).join("; ");
      return out;
    });
  }

  /** Quality report as rows (issue type, count, treatment) suitable for CSV. */
  var CODE_LABELS = {
    duplicate: ["Exact duplicate rows", "Removed (first occurrence kept)"],
    product_missing: ["Missing product name", "Flagged for review; not guessed"],
    date_missing: ["Missing date", "Flagged for review"],
    qty_missing: ["Missing quantity", "Flagged for review"],
    price_missing: ["Missing unit price", "Flagged for review; no zero or average filled in"],
    region_missing: ["Missing region", "Flagged for review"],
    date_invalid: ["Invalid date", "Kept as entered; flagged for review"],
    qty_negative: ["Negative quantity (possible return)", "Not changed; flagged for business confirmation"],
    qty_zero: ["Zero quantity", "Flagged for review"],
    qty_whole: ["Non-whole quantity", "Flagged for review"],
    qty_invalid: ["Non-numeric quantity", "Flagged for review"],
    price_invalid: ["Invalid unit price", "Flagged for review"],
    region_invalid: ["Region not in allowed list", "Flagged for review"],
    whitespace: ["Extra whitespace", "Trimmed"],
    case: ["Inconsistent capitalization", "Standardized"],
    date_format: ["Non-standard date format", "Converted to yyyy-mm-dd"],
    price_format: ["Currency formatting in price", "Converted to plain number"]
  };
  function qualityReportRows(result) {
    var s = result.summary, rows = [];
    Object.keys(CODE_LABELS).forEach(function (code) {
      if (s.byCode[code]) rows.push({ section: "Issue", item: CODE_LABELS[code][0], count: s.byCode[code], treatment: CODE_LABELS[code][1] });
    });
    rows.push({ section: "Summary", item: "Records reviewed", count: s.total, treatment: "" });
    rows.push({ section: "Summary", item: "Records retained after duplicate removal", count: s.retained, treatment: "" });
    rows.push({ section: "Summary", item: "Duplicate records removed", count: s.removed, treatment: "Explicit exact-duplicate rule" });
    rows.push({ section: "Summary", item: "Records standardized only (no review needed)", count: s.fixed, treatment: "" });
    rows.push({ section: "Summary", item: "Records flagged for manual review", count: s.flagged, treatment: "Not changed beyond safe formatting" });
    rows.push({ section: "Summary", item: "Completeness before (required fields)", count: s.completenessBefore === null ? "n/a" : (s.completenessBefore * 100).toFixed(1) + "%", treatment: "Non-empty required cells / required cells" });
    rows.push({ section: "Summary", item: "Completeness after (required fields)", count: s.completenessAfter === null ? "n/a" : (s.completenessAfter * 100).toFixed(1) + "%", treatment: "Missing values are not filled, so this changes only by removing duplicates" });
    return rows;
  }

  return { processRows: processRows, parseDate: parseDate, parseMoney: parseMoney, cleanedRows: cleanedRows, qualityReportRows: qualityReportRows, KIND: KIND, CODE_LABELS: CODE_LABELS, canonicalName: canonicalName };
});
