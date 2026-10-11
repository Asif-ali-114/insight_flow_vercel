"use strict";
const { page, pageHero, ctaBand, esc } = require("../shell");
const steps = [
  ["Discovery", "We learn about your business, goals, reporting problems and the outcome you want. We also tell you early if the data is unlikely to answer the question."],
  ["Data collection", "You send approved datasets (CSV or Excel) through an agreed, appropriate secure channel. Share only the columns needed; remove personal data you do not need us to see."],
  ["Data audit", "We assess quality, available fields, completeness, limitations and whether the data suits the analysis you asked for."],
  ["Cleaning and preparation", "We apply documented cleaning and validation rules that you approve. Missing and doubtful values are flagged, not guessed."],
  ["Analysis", "We calculate metrics, investigate trends, compare groups and answer the agreed business questions."],
  ["Visualization", "We build the charts, dashboards and summary tables that make the findings easy to read."],
  ["Findings and recommendations", "We explain the findings, their limitations and potential actions, in language a non-technical audience can follow."],
  ["Delivery and review", "We deliver the agreed files, dashboards and documentation, with reasonable revisions agreed in writing."],
  ["Ongoing reporting", "Optionally, we provide recurring reports and dashboard updates for a defined number of cycles."]
];
const body = pageHero("Our process", "How we work, step by step", "A clear workflow from first conversation to delivery. We do not promise fixed delivery times until the project scope and data requirements are known.") + `
<section class="section" style="padding-top:36px"><div class="container"><ol class="steps">${steps.map((s) => `<li><div><h2 style="font-size:1.15rem;margin-bottom:4px">${esc(s[0])}</h2><p>${esc(s[1])}</p></div></li>`).join("")}</ol>
<div class="card" style="margin-top:28px"><h3>What we ask of you</h3><ul class="muted" style="margin:0"><li>A clear question or decision the analysis should support.</li><li>The data in CSV or Excel form, with a short description of each column.</li><li>Someone who can answer questions about how the data was collected.</li></ul></div></div></section>` + ctaBand("Ready to start with a conversation?");
module.exports = [{ file: "process.html", html: page({ file: "process.html", title: "Our Process", description: "How a data analysis project works: discovery, data collection, audit, cleaning, analysis, visualization, findings, delivery and optional ongoing reporting.", body }) }];
