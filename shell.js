"use strict";
/* Shared HTML shell for generated pages. Plain static HTML is written to the project root by tools/build-pages.js. */
const CFG_PATH = "../js/config.js";
const fs = require("fs");
const path = require("path");

// Read brand constants from the same config the browser uses (single source of truth).
const sandbox = { window: {} };
new Function("window", fs.readFileSync(path.join(__dirname, CFG_PATH), "utf8"))(sandbox.window);
const CFG = sandbox.window.IF_CONFIG;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap">';

/** opts: {file, title, description, body, scripts:[...], chart:boolean, bodyClass, noindex} */
function page(opts) {
  const url = CFG.brand.siteUrl.replace(/\/$/, "") + "/" + (opts.file === "index.html" ? "" : opts.file);
  const title = opts.title.includes(CFG.brand.name) ? opts.title : opts.title + " | " + CFG.brand.name;
  const scripts = ["js/config.js", "js/utils.js", "js/layout.js"].concat(opts.chart ? ["vendor/chart.umd.js"] : []).concat(opts.scripts || []);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(opts.description)}">
${opts.noindex ? '<meta name="robots" content="noindex">' : ""}<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(CFG.brand.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(opts.description)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#17324D">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
${FONTS}
<link rel="stylesheet" href="css/styles.css">
</head>
<body${opts.bodyClass ? ` class="${opts.bodyClass}"` : ""}${opts.bodyAttrs ? " " + opts.bodyAttrs : ""}>
<a class="skip-link" href="#main">Skip to main content</a>
<div id="site-header"></div>
<main id="main">
${opts.body}
</main>
<div id="site-footer"></div>
<noscript><p style="padding:16px;text-align:center;background:#FFF7ED">The navigation, dashboards and demos on this site need JavaScript. Core pages are readable without it. <a href="index.html">Home</a> · <a href="contact.html">Contact</a></p></noscript>
${scripts.map((s) => `<script src="${s}"></script>`).join("\n")}
</body>
</html>
`;
}

function pageHero(eyebrow, h1, lead, extra) {
  return `<section class="page-hero"><div class="container"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(h1)}</h1><p class="lead">${esc(lead)}</p>${extra || ""}</div></section>`;
}

const ctaBand = (text) => `<section class="section"><div class="container"><div class="card" style="text-align:center;padding:36px"><h2>${esc(text || "Have a dataset and a question?")}</h2><p style="margin:0 auto 18px">Tell us what you want to understand. We will say what the data can and cannot support before any work starts.</p><div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="contact.html">Discuss Your Project</a><a class="btn btn-secondary" href="pricing.html">See pricing</a></div></div></div></section>`;

module.exports = { page, pageHero, ctaBand, esc, CFG };
