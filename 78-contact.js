"use strict";
const { page, pageHero, esc, CFG } = require("../shell");
const services = require("../content/services");
const opt = (arr) => arr.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
const sel = (id, label, options, req, hint) => `<div class="form-field" data-field="${id}"><label for="${id}">${label}${req ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span>' : ' <span class="muted small">(optional)</span>'}</label><select id="${id}" name="${id}"${req ? ' aria-required="true"' : ""} aria-describedby="${id}-err"><option value="">Select…</option>${options}</select>${hint ? `<span class="hint">${hint}</span>` : ""}<span class="err" id="${id}-err" role="alert"></span></div>`;
const inp = (id, label, type, req, ac, hint) => `<div class="form-field" data-field="${id}"><label for="${id}">${label}${req ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span>' : ""}</label><input type="${type}" id="${id}" name="${id}" autocomplete="${ac}"${req ? ' aria-required="true"' : ""} aria-describedby="${id}-err"><span class="err" id="${id}-err" role="alert"></span>${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;

const body = pageHero("Contact", "Discuss your project", "Tell us what you want to understand. The more specific you are, the better we can say what the data can support.") + `
<section class="section" style="padding-top:36px"><div class="container"><div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:28px" id="contact-grid">
<div class="card" style="padding:26px"><h2 style="font-size:1.3rem">Project inquiry</h2>
<div class="notice info" id="method-note" role="note" style="margin-bottom:16px"><p></p></div>
<form id="inquiry" novalidate>
<div class="form-grid">
${inp("name", "Full name", "text", true, "name")}${inp("email", "Business email", "email", true, "email")}
${inp("company", "Company or organization", "text", true, "organization")}
${sel("industry", "Industry", opt(["Retail", "E-commerce", "Education", "Services", "Manufacturing", "Healthcare administration", "Non-profit", "Other"]), false)}
${sel("service", "Service required", services.map((s) => `<option value="${s.id}">${esc(s.title)}</option>`).join(""), true)}
${sel("datasetSize", "Approximate dataset size", opt(["Under 1,000 rows", "1,000 – 50,000 rows", "50,000 – 500,000 rows", "More than 500,000 rows", "Not sure"]), false)}
${sel("deliverable", "Preferred deliverable", opt(["Cleaned file", "Written report (PDF or HTML)", "Interactive dashboard", "Automated report script", "Not sure yet"]), false)}
${sel("timeframe", "Expected timeframe", opt(["As soon as possible", "Within a month", "Within three months", "Flexible"]), true)}
${sel("budget", "Budget range (USD)", opt(["Under $100", "$100 – $250", "$250 – $1,000", "Over $1,000", "Prefer to discuss"]), false)}
<div class="form-field full" data-field="description"><label for="description">Project description <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><textarea id="description" name="description" aria-required="true" aria-describedby="description-err description-hint" maxlength="4000"></textarea><span class="hint" id="description-hint">At least 20 characters. See the checklist for what helps.</span><span class="err" id="description-err" role="alert"></span></div>
<div class="hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="website" id="website" tabindex="-1" autocomplete="off"></label></div>
</div>
<p class="small muted" style="margin-top:14px">Please do not paste confidential data into this form. We will agree a secure way to share files after we speak.</p>
<div class="btn-row" style="margin-top:8px"><button type="submit" class="btn btn-primary" id="submit-btn">Send inquiry</button></div>
<div class="form-status" id="form-status" role="status" aria-live="polite" tabindex="-1"></div>
</form></div>
<div><div class="card"><h3>What to include</h3><ul class="muted small"><li>The decision or question the analysis should support.</li><li>What data you have: source, file type, rough size and period covered.</li><li>What the columns mean, and anything you already know is wrong.</li><li>The output you want: cleaned file, report or dashboard.</li><li>Who will read the results and when you need them.</li><li>Any confidentiality requirements.</li></ul></div>
<div class="card" style="margin-top:16px"><h3>Direct email</h3><p class="small muted" style="margin:0">Prefer email? <a id="direct-email" href="mailto:${esc(CFG.brand.email)}">${esc(CFG.brand.email)}</a></p></div></div>
</div></div></section>`;
module.exports = [{ file: "contact.html", html: page({ file: "contact.html", title: "Contact: Discuss Your Project", description: "Contact us about data cleaning, dashboards, analysis or reporting automation. Tell us about your dataset and what you want to understand.", scripts: ["js/contact.js"], body }) }];
