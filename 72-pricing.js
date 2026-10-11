"use strict";
const { page, pageHero, ctaBand } = require("../shell");
const body = pageHero("Pricing", "Transparent starting points", "Example packages with editable prices. Final quotes depend on your data and what you need delivered.") + `
<section class="section" style="padding-top:36px"><div class="container">
<div id="pricing-cards" class="grid cols-4" aria-live="polite"><div class="loading" role="status">Loading packages…</div></div>
<div class="notice" role="note" style="margin-top:22px"><p id="scope-note"></p></div>
<div class="card" style="margin-top:22px;text-align:center"><h2>Need something bigger or different?</h2><p style="margin:0 auto 16px">Complex datasets, several sources, integrations or strict security needs are quoted individually.</p><a class="btn btn-primary" href="contact.html?service=custom&quote=1">Request a Custom Quote</a></div>
<noscript><p>Packages: Data Cleanup (starting at $25), Business Insights ($59), Interactive Dashboard ($129), Monthly Analytics (from $99/month). Prices are starting points; see the contact page for a quote.</p></noscript>
</div></section>
<section class="section alt"><div class="container"><div class="section-head"><h2>What affects the price</h2></div>
<div class="grid cols-2"><div class="card"><ul class="muted" style="margin:0"><li>Dataset size and number of files</li><li>How messy the data is</li><li>Required integrations</li></ul></div><div class="card"><ul class="muted" style="margin:0"><li>Security and confidentiality requirements</li><li>The deliverables you need</li><li>The number of reporting cycles for monthly work</li></ul></div></div>
<p class="muted" style="margin-top:16px">Revisions, datasets and turnaround are agreed in writing before work starts. Nothing is unlimited or guaranteed by default.</p></div></section>` + ctaBand("Want a quote for your dataset?");
module.exports = [{ file: "pricing.html", html: page({ file: "pricing.html", title: "Pricing", description: "Example data analytics packages: data cleanup from $25, business insights $59, interactive dashboard $129, monthly analytics from $99 per month. Custom quotes available.", scripts: ["js/pricing.js"], body }) }];
