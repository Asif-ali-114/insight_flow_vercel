#!/usr/bin/env node
"use strict";
/* Generates the static HTML pages in the project root.
   Usage: node tools/build-pages.js   (re-run after editing anything in tools/pages/) */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const dir = path.join(__dirname, "pages");
const built = [];
fs.readdirSync(dir).filter((f) => f.endsWith(".js")).sort().forEach((f) => {
  const mod = require(path.join(dir, f));
  (Array.isArray(mod) ? mod : [mod]).forEach((p) => {
    fs.writeFileSync(path.join(ROOT, p.file), p.html);
    built.push(p);
  });
});

// sitemap + robots (site URL comes from js/config.js; replace before publishing)
const { CFG } = require("./shell");
const base = CFG.brand.siteUrl.replace(/\/$/, "");
const urls = built.filter((p) => !p.noindex).map((p) => base + "/" + (p.file === "index.html" ? "" : p.file));
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map((u) => "  <url><loc>" + u + "</loc></url>").join("\n") + "\n</urlset>\n");
fs.writeFileSync(path.join(ROOT, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: " + base + "/sitemap.xml\n");
console.log("Built " + built.length + " pages: " + built.map((p) => p.file).join(", "));
