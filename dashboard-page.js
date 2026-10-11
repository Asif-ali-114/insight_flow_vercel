/* Dashboard gallery (dashboards.html) and single dashboard view (dashboard.html?id=...). */
(function () {
  "use strict";
  var esc = window.IF_ESC, icon = window.IF_ICON;
  var list = (window.IF_DASHBOARDS || []).slice().sort(function (a, b) { return a.order - b.order; });
  var mode = document.body.getAttribute("data-mode");

  if (mode === "gallery") {
    var host = document.getElementById("gallery");
    host.innerHTML = list.map(function (d) {
      return '<article class="card hover gallery-card"><div class="card-icon">' + icon(d.icon, "lg") + "</div>" +
        '<span class="pill teal" style="align-self:flex-start">' + (d.order <= 10 ? "Dashboard " + d.order : "Optional " + d.order) + "</span>" +
        "<h2 class=\"h-card\">" + esc(d.title) + "</h2><p style=\"margin:0;color:var(--muted)\">" + esc(d.blurb) + "</p>" +
        '<div class="meta">' + d.tags.map(function (t) { return '<span class="pill">' + esc(t) + "</span>"; }).join("") + "</div>" +
        '<a class="btn btn-secondary" href="dashboard.html?id=' + encodeURIComponent(d.id) + '" aria-label="Explore dashboard: ' + esc(d.title) + '">Explore Dashboard ' + icon("arrow") + "</a></article>";
    }).join("");
    return;
  }

  /* single dashboard */
  var id = new URLSearchParams(location.search).get("id");
  var def = list.filter(function (d) { return d.id === id; })[0];
  var mountEl = document.getElementById("dash-mount");
  var nav = document.getElementById("dash-nav");
  nav.innerHTML = list.map(function (d) {
    return '<li><a href="dashboard.html?id=' + encodeURIComponent(d.id) + '"' + (def && d.id === def.id ? ' aria-current="page"' : "") + ">" + d.order + ". " + esc(d.title) + "</a></li>";
  }).join("");

  if (!def) {
    document.getElementById("dash-title").textContent = "Dashboard not found";
    document.getElementById("dash-lead").textContent = "That dashboard does not exist. Choose one from the list above or return to the gallery.";
    mountEl.innerHTML = '<div class="error-box" role="alert">No dashboard matches “' + esc(id || "") + '”. <a href="dashboards.html">Back to all dashboards</a>.</div>';
    document.title = "Dashboard not found | " + window.IF_CONFIG.brand.name;
    return;
  }
  document.title = def.title + " dashboard | " + window.IF_CONFIG.brand.name;
  var desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", def.blurb + " Interactive sample dashboard with filters, charts and CSV export (synthetic data).");
  document.getElementById("dash-title").textContent = def.title;
  document.getElementById("dash-lead").textContent = def.blurb;
  window.IFDash.mount(mountEl, def);
})();
