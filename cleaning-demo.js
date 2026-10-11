/* Before / after data-cleaning demonstration (data-cleaning.html).
   Every number on the page is computed by IFClean.processRows over the rows shown: nothing is hard-coded. */
(function () {
  "use strict";
  var C = window.IFClean, U = window.IFU, esc = window.IF_ESC, icon = window.IF_ICON;
  var root = document.getElementById("clean-demo");
  if (!root) return;

  var PRODUCTS = ["Laptop", "Mouse", "Keyboard", "Monitor"];
  var COLS = [["orderId", "Order ID"], ["product", "Product"], ["orderDate", "Date"], ["quantity", "Quantity"], ["unitPrice", "Unit Price"]];
  var SAMPLE = [
    ["1001", "laptop", "2026-01-05", "2", "500"],
    ["1002", "Laptop", "05/01/2026", "1", "500"],
    ["1002", "Laptop", "05/01/2026", "1", "500"],
    ["1003", "Mouse", "2026/01/08", "-2", "15"],
    ["1004", "", "2026-01-09", "1", "25"],
    ["1005", "Keyboard", "2026-01-10", "3", ""],
    ["1006", "  MOUSE  ", "11/01/2026", "2", "$15.00"],
    ["1007", "keyboard", "2026-01-12", "1", "45 USD"],
    ["1008", "Laptop", "2026-02-30", "1", "500"],
    ["1009", "Monitor", "13/01/2026", "2.5", "1,180"],
    ["1010", "laptop ", "2026-01-14", "1", "500"]
  ];

  var state = { tab: "side", kind: "All", conv: "dmy", dup: "remove", rows: SAMPLE.map(function (r) { return r.slice(); }), source: "sample", showSteps: false };
  var result = null;

  function toObjs(rows) { return rows.map(function (r) { var o = {}; COLS.forEach(function (c, i) { o[c[0]] = r[i]; }); return o; }); }
  function run() {
    result = C.processRows(toObjs(state.rows), { dateConvention: state.conv, canonicalProducts: state.source === "sample" ? PRODUCTS : null, requiredFields: ["product", "orderDate", "quantity", "unitPrice"] });
    // Approved rule: keep duplicates instead of removing them (they stay in the data, flagged).
    if (state.dup === "keep") {
      result.records.forEach(function (r) { if (r.status === "removed") { r.status = "flagged"; r.keptDup = true; } });
    }
  }
  function kindSet(r) { var s = {}; r.issues.forEach(function (i) { s[i.kind] = true; }); return s; }
  function matchesKind(r) {
    if (state.kind === "All") return true;
    var k = kindSet(r);
    return state.kind === "clean" ? r.issues.length === 0 : !!k[state.kind];
  }
  function fieldKinds(r, f) { var k = {}; r.issues.forEach(function (i) { if (i.field === f) k[i.kind] = true; }); return k; }

  function cellClass(r, f, view) {
    var k = fieldKinds(r, f);
    if (view === "before") return k.missing || k.invalid || k.duplicate ? "cell-bad" : k.formatting ? "cell-bad" : "";
    if (k.missing || k.invalid) return "cell-flag";
    if (k.formatting) return "cell-fixed";
    return "";
  }
  function fmtVal(v, f) { if (v === "" || v === null || v === undefined) return '<span class="muted">[missing]</span>'; return esc(v); }

  function table(view) {
    var recs = result.records.filter(matchesKind);
    var head = '<tr><th scope="col">#</th>' + COLS.map(function (c) { return '<th scope="col"' + (c[0] === "quantity" || c[0] === "unitPrice" ? ' class="num"' : "") + ">" + esc(c[1]) + "</th>"; }).join("") + '<th scope="col">' + (view === "before" ? "Issues found" : "Result") + "</th></tr>";
    var body = recs.map(function (r) {
      var removed = r.status === "removed";
      if (view === "after" && removed) return "";
      var src = view === "before" ? r.raw : r.clean;
      var cls = view === "before" && removed ? ' class="removed"' : view === "after" && r.status === "flagged" ? ' class="flagged"' : "";
      var cells = COLS.map(function (c) {
        var v = src[c[0]];
        if (view === "before" && c[0] === "orderId" && removed) return "<td>" + esc(v) + "</td>";
        var show = (view === "before" && (v === "" || v === null || v === undefined)) ? '<span class="muted">[missing]</span>' : (v === "" || v === undefined ? '<span class="muted">[missing]</span>' : esc(v));
        // make whitespace visible in the original view
        if (view === "before" && typeof v === "string" && v !== v.trim() && v !== "") show = '"' + esc(v).replace(/ /g, "·") + '"';
        return '<td class="' + (cellClass(r, c[0], view) || "") + (c[0] === "quantity" || c[0] === "unitPrice" ? " num" : "") + '">' + show + "</td>";
      }).join("");
      var last;
      if (view === "before") last = r.issues.length ? esc(r.issues.map(function (i) { return i.message; }).join("; ")) : '<span class="muted">None</span>';
      else last = r.keptDup ? "Duplicate kept (your rule) and flagged" : r.status === "flagged" ? "Needs review: " + esc(r.issues.filter(function (i) { return i.kind === "missing" || i.kind === "invalid"; }).map(function (i) { return i.message; }).join("; ")) : r.status === "fixed" ? "Standardized" : "No change";
      return "<tr" + cls + "><td>" + (r.index + 1) + "</td>" + cells + '<td style="white-space:normal;min-width:240px">' + last + "</td></tr>";
    }).join("");
    var removedHidden = view === "after" ? recs.filter(function (r) { return r.status === "removed"; }).length : 0;
    return '<div class="table-scroll" tabindex="0" role="region" aria-label="' + (view === "before" ? "Original data" : "Cleaned data") + ' (scrollable)"><table class="data" style="min-width:640px"><caption class="sr-only">' + (view === "before" ? "Original data" : "Cleaned data") + "</caption><thead>" + head + "</thead><tbody>" +
      (body.replace(/\s/g, "") ? body : '<tr><td colspan="7" class="muted" style="text-align:center;padding:20px">No rows in this issue category.</td></tr>') + "</tbody></table></div>" +
      (removedHidden ? '<p class="small muted" style="margin:8px 0 0">' + removedHidden + " duplicate row(s) removed under the exact-duplicate rule are not shown here; see the original view.</p>" : "");
  }

  function pct(n) { return n === null ? "n/a" : (n * 100).toFixed(1) + "%"; }
  function metrics() {
    var s = result.summary, keptDup = result.records.filter(function (r) { return r.keptDup; }).length;
    var dups = s.byKind.duplicate + keptDup;
    var flagged = result.records.filter(function (r) { return r.status === "flagged"; }).length;
    var removed = result.records.filter(function (r) { return r.status === "removed"; }).length;
    var retained = s.total - removed;
    var m = [
      ["Records reviewed", s.total, "All rows in the file"],
      ["Duplicate rows identified", dups, removed ? removed + " removed" : "none removed"],
      ["Missing values detected", s.missingCells, "Empty required cells"],
      ["Validation issues detected", s.invalidRecords, "Records breaking ≥ 1 explicit rule"],
      ["Records needing manual review", flagged, "Flagged, not changed"],
      ["Records standardized only", result.records.filter(function (r) { return r.status === "fixed"; }).length, "Safe formatting fixes"],
      ["Completeness before", pct(s.completenessBefore), "Non-empty required cells ÷ required cells"],
      ["Completeness after", pct(s.completenessAfter), "Gaps stay gaps; only removed duplicates change it"]
    ];
    return m.map(function (x) { return '<div class="kpi"><div class="label">' + esc(x[0]) + '</div><div class="value">' + esc(x[1]) + '</div><div class="sub">' + esc(x[2]) + "</div></div>"; }).join("") +
      '<p class="sr-only">' + retained + " records retained.</p>";
  }

  function steps() {
    var s = result.summary, c = s.byCode, n = function (k) { return c[k] || 0; };
    var fmtCount = s.byKind.formatting;
    var list = [
      ["1. Inspect the original dataset", s.total + " rows and " + COLS.length + " columns loaded. Nothing is altered yet."],
      ["2. Profile columns and data types", "Dates are parsed with the stated convention (" + (state.conv === "dmy" ? "dd/mm/yyyy" : "mm/dd/yyyy") + " for slash dates), quantities as whole numbers, prices as amounts."],
      ["3. Identify missing values and duplicates", s.missingCells + " empty required cells and " + (s.byKind.duplicate + result.records.filter(function (r) { return r.keptDup; }).length) + " exact duplicate row(s) found."],
      ["4. Detect inconsistencies", fmtCount + " formatting inconsistencies (capitalization " + n("case") + ", whitespace " + n("whitespace") + ", date style " + n("date_format") + ", currency text " + n("price_format") + ") and " + s.byKind.invalid + " invalid value(s) found."],
      ["5. Apply appropriate corrections", "Formatting is standardized. " + (state.dup === "remove" ? "Exact duplicates are removed (first copy kept)." : "Duplicates are kept and flagged, as you approved.") + " Missing and invalid values are left as they are and flagged. No zero, average or guess is filled in."],
      ["6. Validate the cleaned result", "Re-checking the cleaned rows: every remaining issue is a flagged missing or invalid value that needs a business decision (" + result.records.filter(function (r) { return r.status === "flagged"; }).length + " record(s))."],
      ["7. Export the cleaned dataset", "Use “Download cleaned CSV”. It adds Review Status and Review Notes columns."],
      ["8. Provide a summary of changes", "Use “Download quality report” for counts by issue type and how each was handled."]
    ];
    return '<ol class="steps-log">' + list.map(function (x) { return "<li><strong>" + esc(x[0]) + ".</strong> " + esc(x[1]) + "</li>"; }).join("") + "</ol>";
  }

  function render() {
    run();
    var tabs = [["before", "Before"], ["after", "After"], ["side", "Side by side"]];
    var view = state.tab;
    root.querySelector("[data-metrics]").innerHTML = metrics();
    root.querySelector("[data-tabs]").innerHTML = tabs.map(function (t) { return '<button type="button" role="tab" class="tab" id="tab-' + t[0] + '" aria-selected="' + (view === t[0]) + '" aria-controls="cmp-panel" tabindex="' + (view === t[0] ? 0 : -1) + '" data-tab="' + t[0] + '">' + t[1] + "</button>"; }).join("");
    var panel = root.querySelector("#cmp-panel");
    panel.setAttribute("aria-labelledby", "tab-" + view);
    if (view === "side") panel.innerHTML = '<div class="cmp-grid"><div><h3>Before cleaning</h3>' + table("before") + "</div><div><h3>After cleaning</h3>" + table("after") + "</div></div>";
    else panel.innerHTML = "<h3>" + (view === "before" ? "Before cleaning" : "After cleaning") + "</h3>" + table(view);
    var st = root.querySelector("[data-steps]");
    st.hidden = !state.showSteps; st.innerHTML = state.showSteps ? steps() : "";
    var btn = root.querySelector('[data-act="steps"]'); btn.setAttribute("aria-expanded", String(state.showSteps)); btn.textContent = state.showSteps ? "Hide cleaning steps" : "Show Cleaning Steps";
    root.querySelector("[data-source]").textContent = state.source === "sample" ? "Showing the built-in sample (11 rows, deliberately messy)." : "Showing your uploaded file (processed in this browser only; nothing is uploaded).";
  }

  /* ----- CSV parsing for the optional upload (small, quote-aware) ----- */
  function parseCsv(text) {
    var rows = [], row = [], cur = "", q = false, i = 0;
    text = text.replace(/^﻿/, "");
    for (; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
      else cur += ch;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  var ALIASES = { orderId: ["order id", "orderid", "order_id", "order"], product: ["product", "product name", "item"], orderDate: ["date", "order date", "orderdate", "order_date"], quantity: ["quantity", "qty"], unitPrice: ["unit price", "unitprice", "unit_price", "price"] };
  function loadFile(file) {
    var msg = root.querySelector("[data-upload-msg]");
    function bad(t) { msg.className = "form-status bad show"; msg.textContent = t; }
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) return bad("Please choose a .csv file. Excel files can be saved as CSV first.");
    if (file.size > 1024 * 1024) return bad("That file is larger than 1 MB. This demo is limited to small files; larger projects are handled in a normal engagement.");
    var fr = new FileReader();
    fr.onerror = function () { bad("The file could not be read."); };
    fr.onload = function () {
      var grid = parseCsv(String(fr.result));
      if (grid.length < 2) return bad("The file needs a header row and at least one data row.");
      if (grid.length > 501) return bad("This demo reads up to 500 rows. Trim the file or contact us for a full cleanup.");
      var head = grid[0].map(function (h) { return h.trim().toLowerCase(); }), idx = {}, missing = [];
      COLS.forEach(function (c) { idx[c[0]] = -1; ALIASES[c[0]].forEach(function (a) { if (idx[c[0]] === -1 && head.indexOf(a) !== -1) idx[c[0]] = head.indexOf(a); }); if (idx[c[0]] === -1) missing.push(c[1]); });
      if (missing.length) return bad("Missing expected column(s): " + missing.join(", ") + ". Expected headers: Order ID, Product, Date, Quantity, Unit Price.");
      state.rows = grid.slice(1).map(function (r) { return COLS.map(function (c) { return r[idx[c[0]]] === undefined ? "" : r[idx[c[0]]]; }); });
      state.source = "upload"; state.kind = "All"; root.querySelector("#f-kind").value = "All";
      msg.className = "form-status ok show"; msg.textContent = "Loaded " + state.rows.length + " rows from " + file.name + ". Processed locally in your browser.";
      render();
    };
    fr.readAsText(file);
  }

  /* ----- events ----- */
  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-tab],[data-act]"); if (!t) return;
    if (t.dataset.tab) { state.tab = t.dataset.tab; render(); root.querySelector("#tab-" + state.tab).focus(); return; }
    var a = t.dataset.act;
    if (a === "steps") { state.showSteps = !state.showSteps; render(); }
    else if (a === "dl-clean") {
      var rows = C.cleanedRows(result);
      if (state.dup === "keep") rows = result.records.map(function (r) { var o = Object.assign({}, r.clean); var rev = r.issues.filter(function (i) { return i.kind !== "formatting"; }); o.reviewStatus = rev.length ? "Needs review" : "OK"; o.reviewNotes = rev.map(function (i) { return i.message; }).join("; "); return o; });
      U.downloadText("cleaned-sample.csv", U.toCsv([{ key: "orderId", label: "Order ID" }, { key: "product", label: "Product" }, { key: "orderDate", label: "Date" }, { key: "quantity", label: "Quantity" }, { key: "unitPrice", label: "Unit Price" }, { key: "reviewStatus", label: "Review Status" }, { key: "reviewNotes", label: "Review Notes" }], rows));
    } else if (a === "dl-report") {
      U.downloadText("quality-report.csv", U.toCsv([{ key: "section", label: "Section" }, { key: "item", label: "Item" }, { key: "count", label: "Count / value" }, { key: "treatment", label: "How it was handled" }], C.qualityReportRows(result)));
    } else if (a === "restore") {
      state = { tab: "side", kind: "All", conv: "dmy", dup: "remove", rows: SAMPLE.map(function (r) { return r.slice(); }), source: "sample", showSteps: false };
      root.querySelector("#f-kind").value = "All"; root.querySelector("#f-conv").value = "dmy"; root.querySelector("#f-dup").value = "remove"; root.querySelector("#f-file").value = "";
      var m = root.querySelector("[data-upload-msg]"); m.className = "form-status"; m.textContent = "";
      render();
    }
  });
  root.addEventListener("keydown", function (e) {
    var t = e.target.closest("[data-tab]"); if (!t || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    var order = ["before", "after", "side"], i = order.indexOf(t.dataset.tab); i = (i + (e.key === "ArrowRight" ? 1 : 2)) % 3; state.tab = order[i]; render(); root.querySelector("#tab-" + state.tab).focus();
  });
  root.querySelector("#f-kind").addEventListener("change", function (e) { state.kind = e.target.value; render(); });
  root.querySelector("#f-conv").addEventListener("change", function (e) { state.conv = e.target.value; render(); });
  root.querySelector("#f-dup").addEventListener("change", function (e) { state.dup = e.target.value; render(); });
  root.querySelector("#f-file").addEventListener("change", function (e) { loadFile(e.target.files[0]); });
  render();
  root.__clean = { getResult: function () { return result; }, state: state };
})();
