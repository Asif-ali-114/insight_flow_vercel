/* Renders pricing packages from js/config.js so prices are edited in one place. */
(function () {
  "use strict";
  var esc = window.IF_ESC, icon = window.IF_ICON, P = window.IF_CONFIG.pricing;
  var fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: P.currency || "USD", maximumFractionDigits: 0 });
  var host = document.getElementById("pricing-cards");
  host.innerHTML = P.packages.map(function (p) {
    return '<article class="card price-card' + (p.featured ? " featured" : "") + '"><span class="pill' + (p.featured ? "" : " teal") + '" style="align-self:flex-start">' + esc(p.tag) + "</span><h2 style=\"font-size:1.2rem\">" + esc(p.name) + "</h2>" +
      '<div class="price">' + (p.prefix ? "<small>" + esc(p.prefix) + " </small>" : "") + fmt.format(p.price) + (p.suffix ? "<small>" + esc(p.suffix) + "</small>" : "") + "</div>" +
      '<p class="muted small" style="margin:0">' + esc(p.blurb) + "</p><p class=\"small\" style=\"margin:8px 0 0;font-weight:700;color:var(--navy)\">Potential deliverables</p><ul>" +
      p.items.map(function (i) { return "<li>" + icon("check") + "<span>" + esc(i) + "</span></li>"; }).join("") + "</ul>" +
      '<a class="btn ' + (p.featured ? "btn-primary" : "btn-secondary") + '" href="contact.html?package=' + encodeURIComponent(p.id) + '">Choose ' + esc(p.name) + "</a></article>";
  }).join("");
  document.getElementById("scope-note").textContent = P.scopeNote;
})();
