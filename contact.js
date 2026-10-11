/* Contact form. Two honest delivery modes (see js/config.js):
   mailto   -> opens the visitor's email app with the inquiry pre-filled. Nothing is sent by this page.
   endpoint -> POSTs JSON to a form service you control; "success" is shown only on an HTTP 2xx answer. */
(function () {
  "use strict";
  var CFG = window.IF_CONFIG, form = document.getElementById("inquiry"), status = document.getElementById("form-status"), btn = document.getElementById("submit-btn");
  var useEndpoint = CFG.contact.method === "endpoint" && /^https:\/\//.test(CFG.contact.endpoint || "");
  document.querySelector("#method-note p").textContent = useEndpoint
    ? "Your inquiry is sent securely to our form service. We will reply by email."
    : "This site has no server. When you press Send, your email app opens with this inquiry filled in. Nothing is sent until you press Send in your email app.";
  var LABELS = { name: "Full name", email: "Business email", company: "Company or organization", industry: "Industry", service: "Service required", datasetSize: "Approximate dataset size", deliverable: "Preferred deliverable", timeframe: "Expected timeframe", budget: "Budget range (USD)", description: "Project description" };
  var REQUIRED = ["name", "email", "company", "service", "timeframe", "description"];

  /* prefill from links such as contact.html?service=sales or ?package=dashboard */
  var q = new URLSearchParams(location.search), svc = q.get("service"), pk = q.get("package");
  var sSel = document.getElementById("service"); if (svc && sSel.querySelector('option[value="' + svc.replace(/[^\w-]/g, "") + '"]')) sSel.value = svc;
  if (pk) { var map = { cleanup: "data-cleaning", insights: "sales", dashboard: "dashboards", monthly: "automation" }; if (map[pk]) sSel.value = map[pk]; var pkg = CFG.pricing.packages.filter(function (p) { return p.id === pk; })[0]; if (pkg) document.getElementById("description").value = "Interested in the “" + pkg.name + "” package.\n\n"; }

  function setErr(id, msg) {
    var f = form.querySelector('[data-field="' + id + '"]'), e = document.getElementById(id + "-err"), c = document.getElementById(id);
    f.classList.toggle("invalid", !!msg); e.textContent = msg || ""; if (msg) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid");
  }
  function values() { var v = {}; Object.keys(LABELS).forEach(function (k) { v[k] = (form.elements[k].value || "").trim(); }); return v; }
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validate() {
    var v = values(), first = null;
    Object.keys(LABELS).forEach(function (k) { setErr(k, ""); });
    REQUIRED.forEach(function (k) { if (!v[k]) { setErr(k, LABELS[k] + " is required."); first = first || k; } });
    if (v.email && !EMAIL.test(v.email)) { setErr("email", "Enter a valid email address, for example name@company.com."); first = first || "email"; }
    if (v.description && v.description.length < 20) { setErr("description", "Please write at least 20 characters so we can understand the request."); first = first || "description"; }
    if (first) { document.getElementById(first).focus(); }
    return first ? null : v;
  }
  function show(kind, html) { status.className = "form-status show " + kind; status.innerHTML = html; status.focus(); }
  function lines(v) { return Object.keys(LABELS).filter(function (k) { return v[k]; }).map(function (k) { var val = k === "service" ? form.elements.service.selectedOptions[0].textContent : v[k]; return LABELS[k] + ": " + val; }).join("\n"); }
  var esc = window.IF_ESC;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.elements.website.value) return; // honeypot: bots fill this hidden field; show nothing
    var v = validate(); if (!v) { show("bad", "Please fix the highlighted fields and try again."); return; }
    if (useEndpoint) {
      btn.disabled = true; btn.textContent = "Sending…";
      var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 15000);
      fetch(CFG.contact.endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(v), signal: ctl.signal })
        .then(function (r) { if (!r.ok) throw new Error("The form service answered with status " + r.status + "."); show("ok", "<strong>Thank you.</strong> Your inquiry was accepted by our form service. We will reply by email."); form.reset(); })
        .catch(function (err) { show("bad", "<strong>Your inquiry was not sent.</strong> " + esc(err.name === "AbortError" ? "The request timed out." : err.message) + " Please try again, or email us at <a href=\"mailto:" + esc(CFG.brand.email) + "\">" + esc(CFG.brand.email) + "</a>."); })
        .then(function () { clearTimeout(t); btn.disabled = false; btn.textContent = "Send inquiry"; });
      return;
    }
    var subject = "Project inquiry: " + form.elements.service.selectedOptions[0].textContent + " (" + v.company + ")";
    var text = lines(v);
    var href = "mailto:" + CFG.brand.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
    show("info", "<strong>Your email app should now open with this inquiry filled in. Nothing has been sent yet.</strong> Press Send in your email app. If nothing opened, <a href=\"" + esc(href) + "\">click here</a>, copy the text below, or email <a href=\"mailto:" + esc(CFG.brand.email) + "\">" + esc(CFG.brand.email) + "</a>." +
      '<br><button type="button" class="btn btn-secondary btn-sm" id="copy-btn" style="margin-top:10px">Copy inquiry text</button><pre style="white-space:pre-wrap;margin-top:10px;color:#E2E8F0">' + esc(text) + "</pre>");
    document.getElementById("copy-btn").addEventListener("click", function () {
      var b = this; function done(ok) { b.textContent = ok ? "Copied" : "Copy failed: select the text manually"; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); }); else done(false);
    });
    window.location.href = href;
  });
  form.addEventListener("input", function (e) { if (e.target.id && form.querySelector('[data-field="' + e.target.id + '"].invalid')) setErr(e.target.id, ""); });
  form.addEventListener("change", function (e) { if (e.target.id && form.querySelector('[data-field="' + e.target.id + '"].invalid')) setErr(e.target.id, ""); });
})();
