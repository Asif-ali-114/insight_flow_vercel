"use strict";
const { page, pageHero, ctaBand } = require("../shell");
const vals = [["Clear communication", "Plain language, agreed scope, no surprises."], ["Reliable calculations", "Formulas are stated, denominators are defined and results are checked."], ["Transparent methodology", "You can see how every number was produced."], ["Understandable reports", "Findings written for decision-makers, not just analysts."], ["Documented assumptions", "Limits and assumptions are written down."], ["Practical deliverables", "Files and dashboards you can actually use."], ["Respect for confidentiality", "We ask only for the data needed and agree handling in advance."]];
const body = pageHero("About", "A practical data analysis partner", "We provide data analysis, reporting, data cleaning and dashboard development for businesses that want clear numbers they can trust.") + `
<section class="section" style="padding-top:36px"><div class="container">
<div class="grid cols-3">${vals.map((v) => `<div class="card"><h2 class="h-card">${v[0]}</h2><p class="muted" style="margin:0">${v[1]}</p></div>`).join("")}</div>
<div id="about-config" class="grid" style="margin-top:24px"></div>
<div class="notice info" style="margin-top:24px" role="note"><p>Biography, qualifications, experience, client history and certifications appear here only when they are filled in <code>js/config.js</code>. Nothing is claimed that has not been supplied and verified.</p></div>
</div></section>` + ctaBand("Let us talk about your data");
module.exports = [{ file: "about.html", html: page({ file: "about.html", title: "About", description: "About our data analytics service: clear communication, reliable calculations, transparent methodology and respect for client confidentiality.", scripts: ["js/about.js"], body }) }];
