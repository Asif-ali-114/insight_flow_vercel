"use strict";
const { page, pageHero, ctaBand, esc } = require("../shell");
const faqs = [
  ["What types of businesses do you work with?", "Small businesses, growing companies, e-commerce stores, retailers, educational institutions and other organizations that have data in spreadsheets or exports and want clearer reporting. If your question needs data that does not exist yet, we will say so."],
  ["Which file formats can I provide?", "CSV and Excel (.xlsx) files are the most common. Other formats may be possible; ask before sending."],
  ["Can you clean my existing Excel files?", "Yes. We apply documented rules, deliver a cleaned file and a summary of every change, and flag anything doubtful instead of guessing."],
  ["Can you build a custom dashboard?", "Yes. We agree the KPIs and definitions first, then build charts, filters and tables around them. See the sample dashboards for the style."],
  ["Do I need to know Python to use the dashboard?", "No. Dashboards open in a web browser. Python is only used behind the scenes for preparing data or automation."],
  ["Can you automate recurring reports?", "Often, yes. Repeatable steps such as combining monthly files, validating them and calculating KPIs can be scripted. The saving depends on your process and is not guaranteed."],
  ["Can you work with existing spreadsheets?", "Yes. We usually start from the spreadsheets you already use."],
  ["How do you protect confidential business data?", "We ask only for the data needed, agree how files are shared and handled before work starts, and do not use client data in public demonstrations. We do not claim any security certification. The demos on this site run in your browser and do not upload files."],
  ["How is project pricing calculated?", "Dataset size, complexity, required integrations, security requirements and deliverables. The package prices are starting points, and the quote is agreed before work begins."],
  ["How long will a project take?", "It depends on the scope and the condition of the data, so we do not give fixed turnaround times until we have seen both."],
  ["Can you provide monthly reporting?", "Yes. The Monthly Analytics package covers a defined number of reporting cycles, KPI tracking and dashboard updates."],
  ["Can you explain the results to a nontechnical audience?", "Yes. Reports state findings, assumptions and limitations in plain language, and we can walk through them with you."],
  ["Can you work with data that has missing values?", "Yes. Missing values are identified, counted and treated by a rule you approve. They are never silently replaced with zero or an invented value."],
  ["Can I request changes after delivery?", "Reasonable revisions are agreed in writing at the start. Larger changes can be scoped as new work."]
];
const body = pageHero("FAQ", "Frequently asked questions", "Straight answers about files, pricing, confidentiality and what to expect.") + `
<section class="section" style="padding-top:36px"><div class="container" style="max-width:860px">${faqs.map((f) => `<details class="faq"><summary>${esc(f[0])}</summary><div class="answer"><p>${esc(f[1])}</p></div></details>`).join("")}</div></section>` + ctaBand("Still have a question?");
const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f[0], acceptedAnswer: { "@type": "Answer", text: f[1] } })) };
let html = page({ file: "faq.html", title: "FAQ", description: "Answers about file formats, Excel cleaning, dashboards, automation, confidentiality, pricing and turnaround for our data analytics services.", body });
html = html.replace("</head>", `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`);
module.exports = [{ file: "faq.html", html }];
