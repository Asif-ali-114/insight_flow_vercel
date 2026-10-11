/* Reusable dashboard engine.
   One definition object -> toolbar filters, KPI cards, charts, sortable/searchable/paginated table,
   CSV export, reset, empty state, error state. Every KPI, chart and table is computed from the same
   filtered row set, so they cannot disagree.  See js/dashboards.js for the definitions. */
(function () {
  "use strict";
  var U = window.IFU, esc = window.IF_ESC, icon = window.IF_ICON;

  // Validated categorical order (blue, orange, aqua, yellow, magenta, green, violet, red). Fixed per entity.
  var PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
  var INK = "#475569", GRID = "#E2E8F0", NAVY = "#17324D";
  var CAT_COLORS = { Electronics: PALETTE[0], Office: PALETTE[1], Accessories: PALETTE[2], Home: PALETTE[3], Software: PALETTE[4], Audio: PALETTE[5] };
  var REGION_COLORS = { North: PALETTE[0], South: PALETTE[1], East: PALETTE[2], West: PALETTE[3] };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (window.Chart) {
    Chart.defaults.font.family = '"Inter", system-ui, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = INK;
  }

  function isPlain(o) { return o && typeof o === "object" && !Array.isArray(o) && Object.getPrototypeOf(o) === Object.prototype; }
  function merge(base, over) {
    var out = {};
    Object.keys(base || {}).forEach(function (k) { out[k] = base[k]; });
    Object.keys(over || {}).forEach(function (k) { out[k] = isPlain(out[k]) && isPlain(over[k]) ? merge(out[k], over[k]) : over[k]; });
    return out;
  }

  /* ---------- data loading ---------- */
  var loading = {};
  function loadScript(src) {
    if (loading[src]) return loading[src];
    loading[src] = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error("Could not load " + src)); };
      document.head.appendChild(s);
    });
    return loading[src];
  }
  function loadData(keys) {
    window.IF_DATA = window.IF_DATA || {};
    return Promise.all(keys.map(function (k) { return window.IF_DATA[k] ? Promise.resolve() : loadScript("data/" + k + ".js"); }));
  }

  /* ---------- chart defaults ---------- */
  function chartDefaults(cfg, first) {
    var type = cfg.type, ds = (cfg.data && cfg.data.datasets) || [];
    var circular = type === "doughnut" || type === "pie";
    var horizontal = cfg.options && cfg.options.indexAxis === "y";
    var o = {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: reduceMotion || !first ? 0 : 300 },
      interaction: circular ? { mode: "nearest", intersect: true } : { mode: "index", intersect: false },
      plugins: {
        legend: { display: ds.length > 1 || circular, position: "bottom", labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 14, color: INK } },
        tooltip: { backgroundColor: NAVY, titleColor: "#fff", bodyColor: "#fff", padding: 10, cornerRadius: 8, boxPadding: 4 }
      }
    };
    if (!circular) {
      o.scales = {
        x: { grid: { display: horizontal, color: GRID }, border: { color: GRID }, ticks: { color: INK, autoSkip: true, maxRotation: 0 } },
        y: { beginAtZero: true, grid: { display: !horizontal, color: GRID }, border: { display: false }, ticks: { color: INK } }
      };
    }
    return o;
  }
  function styleDatasets(cfg) {
    (cfg.data.datasets || []).forEach(function (d) {
      var t = d.type || cfg.type;
      if (t === "bar") {
        var h = cfg.options && cfg.options.indexAxis === "y";
        if (d.borderRadius === undefined) d.borderRadius = h ? { topRight: 4, bottomRight: 4 } : { topLeft: 4, topRight: 4 };
        if (d.maxBarThickness === undefined) d.maxBarThickness = 28;
        if (d.borderSkipped === undefined) d.borderSkipped = false;
      } else if (t === "line") {
        if (d.borderWidth === undefined) d.borderWidth = 2;
        if (d.pointRadius === undefined) d.pointRadius = 0;
        if (d.pointHoverRadius === undefined) d.pointHoverRadius = 5;
        if (d.tension === undefined) d.tension = 0.2;
      } else if (t === "doughnut" || t === "pie") {
        if (d.borderColor === undefined) d.borderColor = "#fff";
        if (d.borderWidth === undefined) d.borderWidth = 2;
      }
    });
  }
  var moneyTick = function (v) { return U.compactMoney(v); };
  var tipMoney = function (c) { return " " + c.dataset.label + ": " + U.money(c.parsed.y !== undefined && c.chart.options.indexAxis !== "y" ? c.parsed.y : c.parsed.x); };
  var tipPct = function (c) { return " " + c.dataset.label + ": " + U.pct(c.parsed.y !== undefined && c.chart.options.indexAxis !== "y" ? c.parsed.y : c.parsed.x, 1); };

  /* ---------- the engine ---------- */
  function mount(el, def) {
    el.innerHTML = '<div class="loading" role="status">Loading ' + esc(def.title) + "…</div>";
    return loadData(def.data).then(function () {
      var ctx;
      try { ctx = def.prepare(window.IF_DATA); } catch (e) { return fail(e); }
      try { build(el, def, ctx); } catch (e) { fail(e); }
    }, fail);
    function fail(e) {
      console.error(e);
      el.innerHTML = '<div class="error-box" role="alert"><strong>This dashboard could not be loaded.</strong> ' + esc(e && e.message ? e.message : "Unknown error") +
        ". Check that the data files are present next to the page and reload.</div>";
    }
  }

  function build(el, def, ctx) {
    var uid = "d-" + def.id;
    var charts = {};          // chart id -> Chart instance
    var firstDraw = true;
    var state = {};
    var tableState = { sort: null, page: 0, q: "" };
    var filters = (def.filters || []).map(function (f) { return normalizeFilter(f, ctx); });
    var rendering = false;

    function normalizeFilter(f, ctx) {
      var n = Object.assign({}, f);
      if (n.type === "date") {
        n.min = ctx.minDate; n.max = ctx.maxDate; n.field = n.field || "date";
        n.def = { from: ctx.minDate, to: ctx.maxDate };
        n.pred = function (r, v) { return r[n.field] >= v.from && r[n.field] <= v.to; };
      } else if (n.type === "month") {
        n.field = n.field || "month"; n.options = ctx.months;
        n.def = { from: ctx.months[0], to: ctx.months[ctx.months.length - 1] };
        n.pred = function (r, v) { return r[n.field] >= v.from && r[n.field] <= v.to; };
      } else if (n.type === "select") {
        var opts = typeof n.options === "function" ? n.options(ctx) : n.options;
        n.opts = opts.map(function (o) { return typeof o === "string" ? { value: o, label: o } : o; });
        n.def = n.def !== undefined ? n.def : "All";
        if (!n.pred) { var fld = n.field; n.pred = function (r, v) { return v === "All" || r[fld] === v; }; }
      } else if (n.type === "text") {
        n.def = "";
        n.pred = function (r, v) {
          if (!v) return true; var q = v.toLowerCase();
          return n.fields.some(function (k) { return String(r[k] == null ? "" : r[k]).toLowerCase().indexOf(q) !== -1; });
        };
      }
      return n;
    }
    function defaults() {
      var s = {};
      filters.forEach(function (f) { s[f.id] = f.def && typeof f.def === "object" ? Object.assign({}, f.def) : f.def; });
      return s;
    }
    state = defaults();

    /* ----- shell ----- */
    var infoHtml =
      '<div class="dash-info"><div class="card"><h2 class="h-card">Business purpose</h2><p>' + esc(def.purpose) + '</p><p class="small muted" style="margin:0"><strong>Problem solved:</strong> ' + esc(def.problem) + "</p></div>" +
      '<div class="card"><h2 class="h-card">What you can learn</h2><ul class="def-list" style="font-size:.92rem;color:var(--text)">' + def.learn.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div></div>";
    var filterHtml = filters.map(function (f) { return filterControl(f); }).join("");
    el.innerHTML =
      '<div class="dash" data-dash="' + esc(def.id) + '">' +
      '<div class="notice" role="note">' + icon("info") + "<p><strong>Sample data.</strong> " + esc(def.sampleNote || "This dashboard uses a synthetic dataset created for demonstration. It is not connected to any real company, platform or customer data.") + "</p></div>" +
      '<div style="height:16px"></div>' + infoHtml +
      '<div class="dash-toolbar" role="group" aria-label="Dashboard filters">' + filterHtml +
      '<div class="actions"><button type="button" class="btn btn-secondary btn-sm" data-act="reset">' + icon("reset") + " Reset filters</button>" +
      '<button type="button" class="btn btn-secondary btn-sm" data-act="export">' + icon("download") + " Export filtered data (CSV)</button>" +
      '<a class="btn btn-ghost btn-sm" href="data/' + esc(def.csv || def.data[0]) + '.csv" download>' + icon("download") + " Sample dataset</a></div></div>" +
      '<div class="status" role="status" aria-live="polite" data-el="status"></div>' +
      '<div class="empty-state" data-el="empty"><h3>No records match these filters</h3><p>Try widening the date range or choosing “All” in a dropdown.</p>' +
      '<button type="button" class="btn btn-primary btn-sm" data-act="reset">Reset filters</button></div>' +
      '<div data-el="results"><div class="kpis" data-el="kpis"></div><div class="chart-grid" data-el="charts"></div>' +
      '<div class="table-card" data-el="table"></div>' +
      (def.definitions ? '<div class="card"><h3>Metric definitions</h3><ul class="def-list">' + def.definitions.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul></div>" : "") +
      "</div></div>";

    var $ = function (s) { return el.querySelector(s); };
    var statusEl = $('[data-el="status"]'), emptyEl = $('[data-el="empty"]'), resultsEl = $('[data-el="results"]');
    var kpiEl = $('[data-el="kpis"]'), chartsEl = $('[data-el="charts"]'), tableEl = $('[data-el="table"]');

    /* charts shell (built once) */
    chartsEl.innerHTML = (def.charts || []).map(function (c) {
      return '<section class="chart-card' + (c.wide ? " wide" : "") + '" aria-labelledby="' + uid + "-" + c.id + '-t">' +
        '<h3 id="' + uid + "-" + c.id + '-t">' + esc(c.title) + "</h3>" +
        '<p class="chart-desc">' + esc(c.desc || "") + (c.crossFilter ? " Click a " + (c.type === "doughnut" ? "segment" : "bar") + " to filter; click again to clear." : "") + "</p>" +
        '<div class="chart-box' + (c.tall ? " tall" : "") + '"><canvas id="' + uid + "-" + c.id + '" role="img" aria-label="' + esc(c.title) + '"></canvas></div>' +
        '<p class="chart-summary" data-sum="' + c.id + '"></p>' +
        '<details class="chart-data small"><summary style="cursor:pointer;color:var(--blue-dark);font-weight:600">View chart data as a table</summary><div class="table-scroll" data-tbl="' + c.id + '" style="margin-top:8px"></div></details></section>';
    }).join("");

    /* ----- filter controls ----- */
    function filterControl(f) {
      var id = uid + "-f-" + f.id;
      if (f.type === "date") {
        return '<div class="field"><label for="' + id + '-from">' + esc(f.label) + ' from</label><input type="date" id="' + id + '-from" data-f="' + f.id + '" data-part="from" min="' + f.min + '" max="' + f.max + '" value="' + f.min + '"></div>' +
          '<div class="field"><label for="' + id + '-to">' + esc(f.label) + ' to</label><input type="date" id="' + id + '-to" data-f="' + f.id + '" data-part="to" min="' + f.min + '" max="' + f.max + '" value="' + f.max + '"></div>';
      }
      if (f.type === "month") {
        var opts = f.options.map(function (m) { return '<option value="' + m + '">' + U.monthLabel(m, true) + "</option>"; }).join("");
        return '<div class="field"><label for="' + id + '-from">' + esc(f.label) + ' from</label><select id="' + id + '-from" data-f="' + f.id + '" data-part="from">' + opts + "</select></div>" +
          '<div class="field"><label for="' + id + '-to">' + esc(f.label) + ' to</label><select id="' + id + '-to" data-f="' + f.id + '" data-part="to">' + opts + "</select></div>";
      }
      if (f.type === "select") {
        return '<div class="field"><label for="' + id + '">' + esc(f.label) + '</label><select id="' + id + '" data-f="' + f.id + '">' +
          (f.noAll ? "" : '<option value="All">' + esc(f.allLabel || "All") + "</option>") + f.opts.map(function (o) { return o.value === "All" ? "" : '<option value="' + esc(o.value) + '">' + esc(o.label) + "</option>"; }).join("") + "</select></div>";
      }
      if (f.type === "text") {
        return '<div class="field grow"><label for="' + id + '">' + esc(f.label) + '</label><input type="search" id="' + id + '" data-f="' + f.id + '" placeholder="' + esc(f.placeholder || "Type to filter…") + '" autocomplete="off"></div>';
      }
      return "";
    }
    function syncControls() {
      filters.forEach(function (f) {
        var v = state[f.id], base = uid + "-f-" + f.id;
        if (f.type === "date" || f.type === "month") {
          $("#" + base + "-from").value = v.from; $("#" + base + "-to").value = v.to;
        } else { var c = $("#" + base); if (c) c.value = v; }
      });
    }
    function setSelectFilter(id, val) {
      state[id] = val; syncControls(); tableState.page = 0; render();
    }

    /* ----- events (single delegated listeners, attached once) ----- */
    var debounce;
    el.addEventListener("input", function (e) {
      var t = e.target; if (!t.dataset || !t.dataset.f) return;
      if (t.type === "search") { clearTimeout(debounce); debounce = setTimeout(function () { readControl(t); }, 150); }
    });
    el.addEventListener("change", function (e) {
      var t = e.target;
      if (t.dataset && t.dataset.f && t.type !== "search") readControl(t);
    });
    el.addEventListener("input", function (e) {
      var t = e.target; if (t.dataset && t.dataset.tsearch !== undefined) { tableState.q = t.value; tableState.page = 0; renderTable(lastRows); }
    });
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var act = b.dataset.act;
      if (act === "reset") { state = defaults(); tableState = { sort: null, page: 0, q: "" }; syncControls(); clearInvalid(); render(); statusEl.textContent = "Filters reset to the full sample dataset."; }
      else if (act === "export") exportCsv();
      else if (act === "sort") { var k = b.dataset.key; var s = tableState.sort || {}; tableState.sort = { key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }; tableState.page = 0; renderTable(lastRows); }
      else if (act === "prev") { tableState.page = Math.max(0, tableState.page - 1); renderTable(lastRows); }
      else if (act === "next") { tableState.page += 1; renderTable(lastRows); }
    });
    function readControl(t) {
      var f = filters.filter(function (x) { return x.id === t.dataset.f; })[0]; if (!f) return;
      if (f.type === "date" || f.type === "month") {
        var cur = Object.assign({}, state[f.id]); cur[t.dataset.part] = t.value || f.def[t.dataset.part]; state[f.id] = cur;
      } else state[f.id] = t.value;
      tableState.page = 0; render();
    }
    function clearInvalid() { el.querySelectorAll("[aria-invalid]").forEach(function (n) { n.removeAttribute("aria-invalid"); }); }

    /* ----- compute + render ----- */
    var lastRows = [];
    function validRanges() {
      var ok = true; clearInvalid();
      filters.forEach(function (f) {
        if ((f.type === "date" || f.type === "month") && state[f.id].from > state[f.id].to) {
          ok = false; var base = uid + "-f-" + f.id;
          $("#" + base + "-from").setAttribute("aria-invalid", "true"); $("#" + base + "-to").setAttribute("aria-invalid", "true");
          statusEl.innerHTML = '<span style="color:var(--error);font-weight:600">' + esc(f.label) + ": the start is after the end. Adjust the range to update the dashboard.</span>";
        }
      });
      return ok;
    }
    function render() {
      if (rendering) return; rendering = true;
      try {
        if (!validRanges()) return;
        statusEl.textContent = "";
        var rows = ctx.rows.filter(function (r) { return filters.every(function (f) { return f.pred(r, state[f.id], ctx); }); });
        lastRows = rows;
        if (!rows.length) {
          emptyEl.classList.add("show"); resultsEl.style.display = "none";
          statusEl.textContent = "No records match the current filters.";
          Object.keys(charts).forEach(function (k) { charts[k].destroy(); delete charts[k]; });
          return;
        }
        emptyEl.classList.remove("show"); resultsEl.style.display = "";
        renderKpis(rows); renderCharts(rows); renderTable(rows);
        statusEl.textContent = U.int(rows.length) + " records match the current filters.";
        if (def.onRender) def.onRender(rows, ctx, state, el);
      } catch (err) {
        console.error(err);
        statusEl.innerHTML = '<span style="color:var(--error)">Something went wrong while updating: ' + esc(err.message) + "</span>";
      } finally { rendering = false; }
    }

    function renderKpis(rows) {
      var list = def.kpis(rows, ctx, state);
      kpiEl.innerHTML = list.map(function (k) {
        var d = "";
        if (k.delta !== undefined) {
          var f = k.delta, dir = f === null ? "flat" : f > 0.0005 ? "up" : f < -0.0005 ? "down" : "flat";
          var ic = dir === "up" ? "up" : dir === "down" ? "down" : "minus";
          var word = f === null ? (k.deltaNA || "No baseline") : dir === "up" ? "Up " + U.signedPct(f) : dir === "down" ? "Down " + U.signedPct(f) : "No change";
          d = '<div class="delta ' + (k.neutral ? "flat" : dir) + '">' + icon(ic) + "<span>" + esc(word) + (k.deltaLabel ? " " + esc(k.deltaLabel) : "") + "</span></div>";
        }
        return '<div class="kpi"><div class="label">' + esc(k.label) + '</div><div class="value">' + esc(k.value) + "</div>" +
          (k.sub ? '<div class="sub">' + esc(k.sub) + "</div>" : "") + d + (k.def ? '<div class="def">' + esc(k.def) + "</div>" : "") + "</div>";
      }).join("");
    }

    function renderCharts(rows) {
      (def.charts || []).forEach(function (c) {
        var canvas = document.getElementById(uid + "-" + c.id);
        var old = charts[c.id]; if (old) { old.destroy(); delete charts[c.id]; }
        var cfg = c.config(rows, ctx, state);
        styleDatasets(cfg);
        cfg.options = merge(chartDefaults(cfg, firstDraw), cfg.options || {});
        if (c.crossFilter) {
          cfg.options.onClick = function (evt, els, chart) {
            if (!els.length) return;
            var label = chart.data.labels[els[0].index];
            var cf = c.crossFilter; var val = cf.map ? cf.map(label) : label;
            setSelectFilter(cf.filter, state[cf.filter] === val ? "All" : val);
          };
          cfg.options.onHover = function (evt, els) { evt.native.target.style.cursor = els.length ? "pointer" : "default"; };
        }
        charts[c.id] = new Chart(canvas, cfg);
        var sum = c.summary ? c.summary(rows, ctx, state, cfg) : "";
        el.querySelector('[data-sum="' + c.id + '"]').textContent = sum;
        canvas.setAttribute("aria-label", c.title + ". " + sum);
        renderChartTable(c, cfg, rows);
      });
      firstDraw = false;
    }
    function renderChartTable(c, cfg, rows) {
      var host = el.querySelector('[data-tbl="' + c.id + '"]'), head, body;
      if (c.tableData) { var t = c.tableData(rows, ctx, state); head = t.headers; body = t.rows; }
      else {
        var labels = cfg.data.labels || [], dss = cfg.data.datasets;
        var fmt = c.valueFmt || function (v) { return typeof v === "number" ? (Math.abs(v) < 1 && v !== 0 ? v.toFixed(3) : U.int(Math.round(v * 100) / 100)) : v; };
        head = [c.labelHeader || "Item"].concat(dss.map(function (d) { return d.label || "Value"; }));
        body = labels.map(function (l, i) { return [l].concat(dss.map(function (d) { return fmt(d.data[i]); })); });
      }
      host.innerHTML = '<table class="data" style="min-width:0"><caption class="sr-only">' + esc(c.title) + ' data</caption><thead><tr>' +
        head.map(function (h, i) { return '<th scope="col"' + (i ? ' class="num"' : "") + ">" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        body.map(function (r) { return "<tr>" + r.map(function (v, i) { return (i ? '<td class="num">' : '<th scope="row" style="font-weight:600">') + esc(v) + (i ? "</td>" : "</th>"); }).join("") + "</tr>"; }).join("") + "</tbody></table>";
    }

    /* ----- table ----- */
    function tableRows(rows) {
      var spec = def.table, data = spec.rows(rows, ctx, state);
      var q = tableState.q.trim().toLowerCase();
      if (q) data = data.filter(function (r) { return spec.columns.some(function (c) { return String(r[c.key] == null ? "" : r[c.key]).toLowerCase().indexOf(q) !== -1; }); });
      var s = tableState.sort || spec.sort;
      if (s) {
        data = data.slice().sort(function (a, b) {
          var x = a[s.key], y = b[s.key];
          if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
          var c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
          return s.dir === "desc" ? -c : c;
        });
      }
      return data;
    }
    function initTableShell() {
      var spec = def.table; if (!spec) { tableEl.style.display = "none"; return; }
      var searchId = uid + "-tsearch";
      tableEl.innerHTML =
        '<div class="table-head"><h3>' + esc(spec.title) + '</h3><div><label class="sr-only" for="' + searchId + '">Search ' + esc(spec.title) + '</label>' +
        '<input class="search-input" type="search" id="' + searchId + '" data-tsearch placeholder="Search table…" autocomplete="off"></div></div>' +
        '<div data-el="tbody"></div>';
    }
    function renderTable(rows) {
      var spec = def.table; if (!spec) return;
      var host = tableEl.querySelector('[data-el="tbody"]');
      var data = tableRows(rows), size = spec.pageSize || 10;
      var pages = Math.max(1, Math.ceil(data.length / size)); tableState.page = Math.min(tableState.page, pages - 1);
      var s = tableState.sort || spec.sort || {}; var start = tableState.page * size;
      var slice = data.slice(start, start + size);
      var sb = tableEl.querySelector("[data-tsearch]"); if (sb && sb.value !== tableState.q) sb.value = tableState.q;
      host.innerHTML =
        '<div class="table-scroll" tabindex="0" role="region" aria-label="' + esc(spec.title) + ' (scrollable)"><table class="data"><caption class="sr-only">' + esc(spec.title) + "</caption><thead><tr>" +
        spec.columns.map(function (c) {
          var sorted = s.key === c.key; var ar = sorted ? (s.dir === "asc" ? "ascending" : "descending") : "none";
          return '<th scope="col" class="' + (c.num ? "num" : "") + '" aria-sort="' + ar + '"><button type="button" data-act="sort" data-key="' + c.key + '">' + esc(c.label) +
            (sorted ? icon(s.dir === "asc" ? "up" : "down") : "") + "</button></th>";
        }).join("") + "</tr></thead><tbody>" +
        (slice.length ? slice.map(function (r) {
          return "<tr" + (r._cls ? ' class="' + r._cls + '"' : "") + ">" + spec.columns.map(function (c) {
            var v = r[c.key]; var shown = c.fmt ? c.fmt(v, r) : v;
            return '<td class="' + (c.num ? "num" : "") + '">' + (c.html ? shown : esc(shown == null ? "" : shown)) + "</td>";
          }).join("") + "</tr>";
        }).join("") : '<tr><td colspan="' + spec.columns.length + '" class="muted" style="text-align:center;padding:24px">No rows match your table search.</td></tr>') +
        "</tbody></table></div>" +
        '<div class="pager"><span>' + (data.length ? "Showing " + (start + 1) + "–" + Math.min(start + size, data.length) + " of " + U.int(data.length) : "0 rows") + '</span>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-act="prev"' + (tableState.page === 0 ? " disabled" : "") + '>Previous</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-act="next"' + (tableState.page >= pages - 1 ? " disabled" : "") + ">Next</button></div>";
    }

    /* ----- export ----- */
    function exportCsv() {
      if (!lastRows.length) { statusEl.textContent = "Nothing to export: no records match the current filters."; return; }
      var cols, data;
      if (def.export) { cols = def.export.columns; data = def.export.rows(lastRows, ctx, state); }
      else { cols = def.table.columns.map(function (c) { return { key: c.key, label: c.label }; }); data = tableRows(lastRows); }
      U.downloadText(def.id + "-filtered.csv", U.toCsv(cols, data));
      statusEl.textContent = "Exported " + U.int(data.length) + " rows to " + def.id + "-filtered.csv.";
    }

    initTableShell();
    syncControls();
    render();
    // test hook (read-only view of current state)
    el.__dash = { getState: function () { return JSON.parse(JSON.stringify(state)); }, rows: function () { return lastRows; }, setState: function (id, v) { state[id] = v; syncControls(); tableState.page = 0; render(); }, tableRows: function () { return tableRows(lastRows); } };
  }

  window.IFDash = { mount: mount, loadData: loadData, PALETTE: PALETTE, CAT_COLORS: CAT_COLORS, REGION_COLORS: REGION_COLORS, moneyTick: moneyTick, tipMoney: tipMoney, tipPct: tipPct, INK: INK, GRID: GRID, NAVY: NAVY };
})();
