"use strict";
const { page, pageHero } = require("../shell");
module.exports = [{ file: "404.html", noindex: true, html: page({ file: "404.html", noindex: true, title: "Page not found", description: "The page you requested could not be found.", body: pageHero("404", "Page not found", "That page does not exist or has moved.", '<div class="btn-row" style="margin-top:12px"><a class="btn btn-primary" href="index.html">Go to the home page</a><a class="btn btn-secondary" href="dashboards.html">Explore dashboards</a><a class="btn btn-secondary" href="contact.html">Contact us</a></div>') }) }];
