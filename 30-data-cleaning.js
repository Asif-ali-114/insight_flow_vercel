"use strict";
const { page, pageHero, ctaBand, esc } = require("../shell");

const issues = [
  ["Missing values", "Blank products, prices or dates. Treated as unknown, never silently set to zero."],
  ["Duplicate rows", "The same transaction exported twice. Removed only when every key field matches exactly."],
  ["Inconsistent capitalization", "“laptop”, “Laptop” and “LAPTOP” split one product into three in a pivot table."],
  ["Extra spaces", "Leading or trailing spaces that make identical names look different."],
  ["Different date formats", "2026-01-05, 05/01/2026 and 2026/01/05 in one column. We state the convention (day-first here) instead of guessing."],
  ["Incorrect data types", "Numbers stored as text, such as “45 USD” or “1,180”."],
  ["Invalid categories", "Values outside an agreed list, such as a region that does not exist."],
  ["Impossible or suspicious values", "Dates like 30 February, quantities of 2.5 units, or negative quantities that may be returns."],
  ["Inconsistent product names", "Several spellings of one product, mapped to an agreed list."],
  ["Incorrect numerical formatting", "Currency symbols, thousands separators and mixed decimal styles."]
];

const body = pageHero("Data cleaning", "See messy data become analysis-ready, and see exactly what changed",
  "This demo runs real cleaning rules in your browser on a small, deliberately messy sales export. Every count below is calculated from the rows shown, nothing is hard-coded, and nothing is guessed.") + `
<section class="section"><div class="container">
<div class="section-head"><h2>Ten problems we look for</h2><p>Cleaning improves consistency and usability before analysis. It does not make a poor dataset perfect, and it never fills gaps with invented numbers.</p></div>
<div class="grid cols-2">${issues.map((i) => `<div class="card" style="padding:16px 18px"><h3 style="font-size:1rem;margin-bottom:2px">${esc(i[0])}</h3><p class="muted small" style="margin:0">${esc(i[1])}</p></div>`).join("")}</div>
</div></section>

<section class="section alt" id="demo"><div class="container">
<div class="section-head"><h2>Interactive before-and-after demo</h2>
<p>Date convention for slash dates in this sample: <strong>day first (dd/mm/yyyy)</strong>, so 05/01/2026 means 5 January 2026. You can change the rules below. Cleaning rules are approved by you, not applied silently.</p></div>

<div id="clean-demo">
<div class="dash-toolbar" role="group" aria-label="Cleaning rules and filters">
  <div class="field"><label for="f-conv">Slash date convention</label><select id="f-conv"><option value="dmy">dd/mm/yyyy (day first)</option><option value="mdy">mm/dd/yyyy (month first)</option></select></div>
  <div class="field"><label for="f-dup">Exact duplicate rule</label><select id="f-dup"><option value="remove">Remove extra copies (keep first)</option><option value="keep">Keep all copies and flag them</option></select></div>
  <div class="field"><label for="f-kind">Show rows with</label><select id="f-kind"><option value="All">All records</option><option value="missing">Missing values</option><option value="invalid">Invalid values</option><option value="formatting">Formatting inconsistencies</option><option value="duplicate">Exact duplicates</option><option value="clean">No issues</option></select></div>
  <div class="actions"><button type="button" class="btn btn-secondary btn-sm" data-act="restore">Restore sample data</button></div>
</div>

<div class="clean-metrics" data-metrics aria-live="polite"></div>

<div class="btn-row" style="margin-bottom:14px">
  <button type="button" class="btn btn-secondary btn-sm" data-act="steps" aria-expanded="false" aria-controls="clean-steps">Show Cleaning Steps</button>
  <button type="button" class="btn btn-primary btn-sm" data-act="dl-clean">Download cleaned CSV</button>
  <button type="button" class="btn btn-secondary btn-sm" data-act="dl-report">Download quality report</button>
  <a class="btn btn-ghost btn-sm" href="data/messy-sample.csv" download>Original sample CSV</a>
</div>
<div id="clean-steps" data-steps hidden style="margin-bottom:16px"></div>

<div class="tabs" role="tablist" aria-label="View" data-tabs></div>
<div class="legend" aria-label="Legend"><span><i style="background:#FEF2F2;box-shadow:inset 0 0 0 1px #FCA5A5"></i>Problem found</span><span><i style="background:#ECFDF3;box-shadow:inset 0 0 0 1px #A7E3BC"></i>Standardized</span><span><i style="background:#FFF7ED;box-shadow:inset 0 0 0 1px #FDD9A8"></i>Flagged for a person to decide</span><span>Text and symbols mark these too: “[missing]”, “·” for spaces.</span></div>
<div id="cmp-panel" role="tabpanel" tabindex="0"></div>
<p class="small muted" data-source style="margin-top:10px"></p>

<div class="card" style="margin-top:24px">
  <h3>Try a small file of your own</h3>
  <p class="muted small">Choose a .csv (up to 1 MB and 500 rows) with the headers <strong>Order ID, Product, Date, Quantity, Unit Price</strong>. It is read and cleaned entirely inside your browser: nothing is uploaded or stored, and the file is never executed. Limits of browser-only processing: no Excel files, no very large files, and your choice of date convention matters.</p>
  <div class="field" style="max-width:420px"><label for="f-file">CSV file</label><input type="file" id="f-file" accept=".csv,text/csv"></div>
  <div class="form-status" data-upload-msg role="status"></div>
</div>
</div>
</div></section>

<section class="section"><div class="container">
<div class="section-head"><h2>Our cleaning rules, in plain language</h2></div>
<div class="grid cols-2">
<div class="card"><h3>What we change automatically</h3><ul class="muted"><li>Capitalization and extra spaces in names.</li><li>Date style, converted to yyyy-mm-dd under the stated convention.</li><li>Currency text such as “$15.00” or “45 USD”, converted to a plain number.</li></ul></div>
<div class="card"><h3>What we never change on our own</h3><ul class="muted"><li>Missing values: no zero, average or guess is filled in.</li><li>Negative quantities: they may be returns, so we ask.</li><li>Impossible dates and fractional quantities: kept and flagged.</li><li>Possible duplicates that are not exact matches.</li></ul></div>
</div></div></section>

<section class="section alt"><div class="container">
<div class="section-head"><h2>Optional Python cleaning script</h2><p>For recurring files we can hand over a script that applies the same agreed rules every time. This is the script used for the sample above (pandas required).</p></div>
<div class="btn-row" style="margin-bottom:12px"><a class="btn btn-secondary btn-sm" href="downloads/clean_sales.py" download>Download clean_sales.py</a></div>
<pre tabindex="0" aria-label="Command to run the cleaning script"><code>pip install pandas
python clean_sales.py messy-sample.csv --date-order dmy
# writes cleaned.csv and quality_report.csv next to the input
# add --keep-duplicates to keep and flag exact duplicates instead of removing them</code></pre>
<h3 style="margin-top:28px">What you receive</h3>
<div class="grid cols-3">
<div class="card"><h3>Cleaned file</h3><p class="muted small" style="margin:0">CSV or Excel with Review Status and Review Notes columns.</p></div>
<div class="card"><h3>Data quality report</h3><p class="muted small" style="margin:0">Counts by issue type and how each was handled.</p></div>
<div class="card"><h3>Summary of changes</h3><p class="muted small" style="margin:0">Records reviewed, standardized, removed and flagged, plus validation results.</p></div>
</div></div></section>` + ctaBand("Have a messy spreadsheet?");

module.exports = [{ file: "data-cleaning.html", html: page({ file: "data-cleaning.html", title: "Data Cleaning Demo: Before and After",
  description: "Interactive before-and-after Excel and CSV data cleaning demo: duplicates, missing values, date formats and invalid quantities handled with explicit, documented rules.",
  scripts: ["js/cleaning-engine.js", "js/cleaning-demo.js"], body }) }];
