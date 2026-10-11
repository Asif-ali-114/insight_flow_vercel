"use strict";
const { page, pageHero, ctaBand, esc } = require("../shell");
const services = require("../content/services");
const ul = (a) => `<ul style="margin:0">${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
const row = (t, v) => `<dt>${t}</dt><dd>${v}</dd>`;
const body = pageHero("Services", "Ten services, each explained properly",
  "For every service: the problem, who needs it, what we analyze, how we work, what you receive and what to expect. Nothing here promises a specific business result.") + `
<section class="section" style="padding-top:36px"><div class="container">
<nav aria-label="Services on this page"><ul class="dash-nav">${services.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join("")}</ul></nav>
<div class="grid" style="gap:28px;margin-top:20px">${services.map((s, i) => `
<article class="card case" id="${s.id}" style="padding:28px"><div class="card-icon" data-icon="${s.icon}" data-icon-class="lg"></div>
<h2 style="font-size:1.5rem">${i + 1}. ${esc(s.title)}</h2>
<p class="lead" style="margin-bottom:18px">${esc(s.problem)}</p>
<dl>
${row("Who needs it", esc(s.who))}${row("Common symptoms", ul(s.symptoms))}${row("What we analyze", ul(s.analyze))}${row("Methodology", `<ol style="margin:0;padding-left:1.2em">${s.method.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`)}${row("Tools used", esc(s.tools))}${row("Deliverables", ul(s.deliverables))}${row("Expected benefits", esc(s.benefits))}${row("Illustrative example", `<em>${esc(s.example)}</em> <span class="small muted">(sample scenario, not a client result)</span>`)}
</dl>
<div class="btn-row" style="margin-top:20px"><a class="btn btn-primary btn-sm" href="contact.html?service=${encodeURIComponent(s.id)}">Discuss this service</a><a class="btn btn-secondary btn-sm" href="${s.link[0]}">${esc(s.link[1])}</a></div>
</article>`).join("")}</div></div></section>` + ctaBand("Not sure which service fits?");
module.exports = [{ file: "services.html", html: page({ file: "services.html", title: "Data Analytics Services",
  description: "Data cleaning, sales analysis, dashboards, customer and marketing analytics, financial analysis, inventory analytics, reporting automation, data validation and education analytics, each explained in detail.", body }) }];
