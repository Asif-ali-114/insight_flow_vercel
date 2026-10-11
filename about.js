/* Shows optional About details from js/config.js only when they were filled in. */
(function () {
  "use strict";
  var esc = window.IF_ESC, A = window.IF_CONFIG.about || {}, host = document.getElementById("about-config"), out = [];
  function card(t, html) { out.push('<div class="card"><h3>' + esc(t) + "</h3>" + html + "</div>"); }
  if (A.biography) card("Biography", "<p>" + esc(A.biography) + "</p>");
  if (A.yearsOfExperience) card("Experience", "<p>" + esc(A.yearsOfExperience) + "</p>");
  if (A.qualifications && A.qualifications.length) card("Qualifications", "<ul>" + A.qualifications.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ul>");
  if (A.certifications && A.certifications.length) card("Certifications", "<ul>" + A.certifications.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ul>");
  if (A.clientHistory) card("Client history", "<p>" + esc(A.clientHistory) + "</p>");
  host.innerHTML = out.join("");
  if (!out.length) host.style.display = "none";
})();
