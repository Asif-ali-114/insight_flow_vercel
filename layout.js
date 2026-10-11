/* Shared layout: icons, header, footer, mobile menu, brand text.
   Every page includes <div id="site-header"></div> and <div id="site-footer"></div>. */
(function () {
  "use strict";
  var CFG = window.IF_CONFIG;

  // Lucide-style 24x24 stroke icons (hand-authored paths, no external dependency).
  var ICONS = {
    broom: '<path d="m19 3-7 7"/><path d="M10 10c-3 0-6 2-6 6 0 3 2 5 5 5 4 0 6-3 6-6z"/><path d="M8 16h4"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
    refresh: '<path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15 6.7L21 16"/><path d="M16 16h5v5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    cap: '<path d="m22 10-10-5L2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    megaphone: '<path d="m3 11 18-6v14L3 13z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H3v14h2"/><path d="M14 9h4l4 4v5h-3"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="m10.3 3.9-8.4 14.5A2 2 0 0 0 3.6 21h16.8a2 2 0 0 0 1.7-2.6L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    minus: '<path d="M5 12h14"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>'
  };
  window.IF_ICON = function (name, cls) {
    return '<svg class="icon ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>";
  };
  window.IF_ESC = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var LOGO =
    '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect width="40" height="40" rx="10" fill="#17324D"/>' +
    '<rect x="9" y="22" width="5" height="9" rx="1.5" fill="#5EEAD4"/><rect x="17.5" y="15" width="5" height="16" rx="1.5" fill="#93C5FD"/>' +
    '<rect x="26" y="9" width="5" height="22" rx="1.5" fill="#FFFFFF"/></svg>';

  var NAV = [
    ["index.html", "Home"],
    ["services.html", "Services"],
    ["dashboards.html", "Dashboards"],
    ["data-cleaning.html", "Data Cleaning"],
    ["business-intelligence.html", "Business Intelligence"],
    ["case-studies.html", "Case Studies"],
    ["process.html", "Process"],
    ["pricing.html", "Pricing"],
    ["about.html", "About"],
    ["faq.html", "FAQ"]
  ];

  function currentFile() {
    var f = location.pathname.split("/").pop();
    return f || "index.html";
  }

  function buildHeader() {
    var cur = currentFile();
    var group = {
      "dashboard.html": "dashboards.html"
    };
    var active = group[cur] || cur;
    var links = NAV.map(function (n) {
      return '<a class="nav-link" href="' + n[0] + '"' + (n[0] === active ? ' aria-current="page"' : "") + ">" + n[1] + "</a>";
    }).join("");
    return (
      '<header class="site-header"><div class="container header-inner">' +
      '<a class="brand" href="index.html" aria-label="' + IF_ESC(CFG.brand.name) + ' home">' + LOGO + "<span>" + IF_ESC(CFG.brand.name) + "</span></a>" +
      '<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open navigation menu">' + IF_ICON("menu", "lg") + "</button>" +
      '<nav class="nav" id="main-nav" aria-label="Main">' + links +
      '<a class="btn btn-primary btn-sm" href="contact.html">Discuss Your Project</a></nav></div></header>'
    );
  }

  function buildFooter() {
    var year = new Date().getFullYear();
    return (
      '<footer class="site-footer"><div class="container"><div class="footer-grid">' +
      '<div><a class="brand" style="color:#fff" href="index.html">' + LOGO + "<span>" + IF_ESC(CFG.brand.name) + "</span></a>" +
      '<p style="margin-top:12px">' + IF_ESC(CFG.brand.tagline) + ".</p></div>" +
      '<div><p class="foot-title">Explore</p><ul><li><a href="services.html">Services</a></li><li><a href="dashboards.html">Interactive dashboards</a></li>' +
      '<li><a href="data-cleaning.html">Data cleaning demo</a></li><li><a href="business-intelligence.html">Sample report</a></li><li><a href="case-studies.html">Case studies</a></li></ul></div>' +
      '<div><p class="foot-title">Work with us</p><ul><li><a href="process.html">Our process</a></li><li><a href="pricing.html">Pricing</a></li><li><a href="faq.html">FAQ</a></li>' +
      '<li><a href="contact.html">Contact</a></li></ul></div></div>' +
      '<p class="footer-note">&copy; ' + year + " " + IF_ESC(CFG.brand.name) + ". All dashboards, datasets, case studies and reports on this site use synthetic sample data for demonstration. They are not connected to any real company data.</p>" +
      "</div></footer>"
    );
  }

  function init() {
    document.querySelectorAll("[data-brand]").forEach(function (el) { el.textContent = CFG.brand.name; });
    var h = document.getElementById("site-header");
    if (h) h.innerHTML = buildHeader();
    var f = document.getElementById("site-footer");
    if (f) f.innerHTML = buildFooter();

    var btn = document.querySelector(".menu-toggle");
    var nav = document.getElementById("main-nav");
    if (btn && nav) {
      var setOpen = function (open) {
        nav.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
        btn.innerHTML = IF_ICON(open ? "close" : "menu", "lg");
      };
      btn.addEventListener("click", function () { setOpen(!nav.classList.contains("open")); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setOpen(false); btn.focus(); } });
      nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    }
    // Hydrate [data-icon] placeholders
    document.querySelectorAll("[data-icon]").forEach(function (el) {
      el.innerHTML = IF_ICON(el.getAttribute("data-icon"), el.getAttribute("data-icon-class") || "");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
