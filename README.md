# InsightFlow Analytics: data analytics services website

A complete, static website for a data analytics consultancy: 12 interactive dashboards, a live before/after data-cleaning demo, a sample analysis report, six illustrative case studies, services, process, pricing, FAQ, about and a contact form.

* Plain HTML, CSS and JavaScript. No framework, no build step needed to run it.
* Chart.js 4.5.1 (MIT) is bundled in `vendor/`, so charts work offline.
* **All data is synthetic.** Nothing is connected to a real company, platform or customer. No paid APIs, no secrets, no database.

> **Before you publish, change two placeholders in `js/config.js`:**
> `brand.email` (currently `hello@example.com`) and `brand.siteUrl` (currently `https://www.example.com`). Then run `node tools/build-pages.js` so `sitemap.xml`, `robots.txt` and the canonical/Open Graph URLs pick up your domain.

## Quick start

Any static file server works. The pages load data with `<script>` tags, so they also open straight from disk, but a server is recommended.

```bash
cd insightflow
python3 -m http.server 8080        # or: npm start
# open http://localhost:8080
```

Node is only needed to regenerate pages/data or run the tests (Node 18+).

## Project layout

```
index.html … 404.html   Generated pages (do not hand-edit; see "Editing pages")
css/styles.css          Design system (colour tokens, layout, components, print styles)
js/config.js            ★ Brand, email, contact method, pricing, About details
js/layout.js            Header, footer, icons, mobile menu (shared by every page)
js/utils.js             Formatting, safe division, % change, CSV export (also used by Node tests)
js/data-prep.js         Sales dataset preparation and KPI calculators (pure functions)
js/cleaning-engine.js   Rule-based cleaning/validation engine (demo, dashboard 9, tests)
js/engine.js            Reusable dashboard engine (filters, KPIs, charts, table, export)
js/dashboards-core.js   Dashboards 1–4 and shared helpers
js/dashboards-more.js   Dashboards 5–12
js/home.js, cleaning-demo.js, report.js, case-studies.js, pricing.js, about.js, contact.js, dashboard-page.js
data/*.js, data/*.csv   Synthetic datasets (JS for the pages, CSV for download)
downloads/clean_sales.py  Optional Python (pandas) cleaning script
tools/generate-data.js  Deterministic dataset generator
tools/build-pages.js    Static page generator (+ sitemap.xml, robots.txt)
tools/pages/*.js        Page content; tools/content/services.js is the shared service text
tests/                  Unit tests and Playwright browser tests
```

## Configuration (`js/config.js`)

| What | Where |
| --- | --- |
| Brand name, tagline | `brand.name`, `brand.shortName`, `brand.tagline` |
| Contact email | `brand.email` |
| Site URL (sitemap, canonical, Open Graph) | `brand.siteUrl`, then `node tools/build-pages.js` |
| Package names, prices, deliverables, scope note | `pricing.packages[]`, `pricing.scopeNote` |
| Biography, qualifications, experience, client history, certifications | `about.*` (empty fields are hidden; nothing is invented) |
| Contact delivery | `contact.method` and `contact.endpoint` |

Brand name and prices are read at run time by `layout.js` and `pricing.js`. A few static sentences in generated pages mention the example prices (meta descriptions, the no-JS fallback); edit them in `tools/pages/` and rebuild if you change prices.

### Contact form: two honest modes

A website with no server cannot deliver a message by itself, so the form never pretends to.

1. **`method: "mailto"` (default).** After validation the visitor's email app opens with the inquiry pre-filled. The page says plainly that nothing has been sent until they press Send there. A "Copy inquiry text" button is the fallback.
2. **`method: "endpoint"`.** The form POSTs JSON to a form service you control and shows "Thank you" **only** if the service answers with HTTP 2xx. On any error or timeout (15 s) it says the inquiry was not sent and offers your email address.

To use a form service such as Formspree:

1. Create a form there and copy its public form URL (for Formspree: `https://formspree.io/f/xxxxxxx`).
2. In `js/config.js` set `contact: { method: "endpoint", endpoint: "https://formspree.io/f/xxxxxxx" }`.
3. In the service's dashboard, add your email as the recipient and enable its spam protection (reCAPTCHA or similar) and allowed-domain settings.

Never put API keys or passwords in this file: it ships to the browser. Use only a public form URL designed for browsers. A hidden honeypot field is included; bots that fill it are ignored. Server-side spam protection depends on the service you pick.

## The dashboards

Twelve dashboards (the ten required plus Website Analytics and Operations/Fulfillment) are plain definition objects consumed by `js/engine.js`. Each gets filters, KPI cards, charts with accessible summaries and a "view chart data as a table" fallback, a sortable/searchable/paginated table, reset, filtered CSV export, a sample-dataset download, a sample-data notice, metric definitions, an empty state and an error state.

Correctness rules built into the engine:

* KPIs, charts and tables are computed from the **same filtered row set**, so they cannot disagree.
* Percentage changes with a zero or missing baseline show "n/a", never infinity.
* Profit and margin use only rows with cost data; nothing is guessed.
* Charts are destroyed and rebuilt on each render (no stale instances); event listeners are attached once per dashboard.
* All user-supplied text is HTML-escaped. CSV export neutralises spreadsheet formula injection (`=`, `+`, `@`).
* Click a bar or segment marked "click to filter" to cross-filter; click again to clear.

### Add a dashboard

Push a definition onto `window.IF_DASHBOARDS` in `js/dashboards-more.js` (copy a small one such as Website Analytics): `id`, `data` (names of `data/*.js` files), `prepare`, `filters`, `kpis`, `charts`, `table`, and optional `export`/`definitions`. It appears on the gallery and `dashboard.html?id=<id>` automatically. Add its id to the `IDS` list in `tools/pages/20-dashboards.js` (used by the no-JS fallback) and to `tests/browser-dashboards.js`.

### Datasets

Generated by `node tools/generate-data.js` with a fixed seed, so output is identical on every run (verified by a unit test). Each dataset exists as `data/<name>.js` (loaded by pages) and `data/<name>.csv` (download).

| Dataset | Content |
| --- | --- |
| `sales` | 3,307 order lines, 30 products, 6 categories, 4 regions, 511 customer IDs, 2025. Unit price/cost per product, discount per order |
| `inventory` | 30-product stock snapshot, 90-day sales, 12 month-end stock counts |
| `expenses` / `income` | Monthly expense lines by category with budget and actual; monthly income = sales revenue |
| `marketing` | Campaign rows: spend, impressions, clicks, conversions |
| `students` | Fictional students, pseudonymous IDs, marks and attendance. Aggregates only; groups under 10 are hidden |
| `quality` | 254-row messy order export with documented injected problems |
| `web` | Weekly sessions/users/conversions by source and landing page |
| `operations` | One fulfillment record per sales order |

## Data-cleaning demo and what it does *not* do

`cleaning-engine.js` standardises safe formatting (case, spaces, date style, currency text), removes only **exact** duplicates (same order ID, product, date, quantity and price after standardising), and **flags** missing, invalid and negative values instead of changing them. The slash-date convention is an explicit choice (default day-first). Every metric on the page is computed from the rows shown. The optional CSV upload (≤ 1 MB, ≤ 500 rows, `.csv` only) is processed entirely in the browser and never uploaded, stored or executed. `downloads/clean_sales.py` applies the same rules with pandas: `pip install pandas && python clean_sales.py file.csv`.

Limits of browser-only processing: small files, CSV only, no persistence, and results depend on the date convention you choose.

## Editing pages

Pages are generated static HTML. Edit content in `tools/pages/*.js` (and `tools/content/services.js`), then run `node tools/build-pages.js`. The shared head, header placeholder and footer placeholder live in `tools/shell.js`. The header and footer are injected by `js/layout.js`, so navigation needs JavaScript. Core page content remains readable without it.

## Deployment

It is a folder of static files; publish the project root.

* **Netlify:** drag the folder in, or connect the repo (no build command; publish directory `.`). `netlify.toml` is included. Netlify serves `404.html` automatically.
* **GitHub Pages:** push the folder to a repository and enable Pages from the branch root. Use a custom domain or keep the repository path in mind: page links are relative, so subfolders work.
* **Vercel / Cloudflare Pages / any web host:** set the output directory to the project root with no build step.
* Set `brand.siteUrl` first and rebuild (see top of this file). Serve over HTTPS.
* `404.html` uses relative asset paths. It renders correctly when the host serves it for root-level missing URLs; deep missing paths on some hosts need a `<base>` tag or absolute paths.
* Google Fonts (Inter, Manrope, JetBrains Mono) load from Google's CDN. If a visitor or network blocks it, system fonts are used. To self-host fonts, download them and replace the `<link>` in `tools/shell.js`.

## Accessibility and responsiveness

Semantic landmarks and heading order, skip link, visible focus rings, labelled controls, keyboard-operable tabs (arrow keys), sortable table headers with `aria-sort`, `aria-live` status messages, text summaries for every chart, a data-table alternative for chart data, reduced-motion support, positive/negative values shown with words and icons as well as colour, tables that scroll inside their own container, and a mobile menu that closes with Escape.

## Testing

Run everything (needs `npm i` once for Playwright and a server on port 8080):

```bash
npm start &                  # static server
npm test                     # unit tests + all browser suites
node tools/build-pages.js    # regenerate pages after edits
```

### Results of the tests actually performed (Chromium via Playwright 1.56, Node 22, 2026-10-10)

| Suite | Result |
| --- | --- |
| `tests/unit.js` (22 tests: % change/zero baseline, formatters, CSV escaping and formula-injection guard, cleaning rules on the brief's exact example, date-convention handling, KPI = row sums, filter partitions, new/returning customers, dataset determinism, dataset cross-references) | 22 passed |
| `tests/browser-dashboards.js`: all 12 dashboards at 1366 px and 375 px: loads, KPIs and live charts, no NaN/Infinity text, no horizontal overflow, filter changes rows, **reset restores the initial state**, sort/search/pagination, table empty-search message, CSV export download, empty-state and its reset, exact check that exported rows equal the filtered rows (both filters) and the KPI equals the sum of those rows | 187 checks, 0 failures |
| `tests/browser-cleaning.js`: metrics match hand-computed values (11 reviewed, 1 duplicate, 2 missing, 5 flagged, completeness 95.5% → 95.0%), tabs, convention and duplicate-rule changes, issue filter, steps toggle, both downloads and their content, upload validation (wrong type, wrong headers), upload of a file containing markup (escaped, not injected), restore | 28 checks, 0 failures (3 consecutive runs) |
| `tests/browser-site.js`: all 13 pages at 1440/768/360 px: exactly one `<h1>`, header/footer, meta description, no horizontal overflow, no unnamed buttons or unlabeled controls, no console errors or failed/404 requests; every internal link returns 200 and every `services.html#anchor` exists; home dashboard filter/reset; 10 service cards; mobile menu open/Escape; all 6 case-study figures filled and valid; pricing values come from config; contact validation messages, mailto mode never claims success, mocked endpoint shows success only on HTTP 200 and failure on 500, honeypot blocks submissions | 348 checks, 0 failures |
| axe-core 4.10 (WCAG 2.0/2.1 A and AA + best practice) on 15 page states at 1366 px and 390 px, including contrast | 0 violations (after fixing heading order, one nested landmark and two contrast issues it found) |

### Not tested / known limitations (honest list)

* **No real email or form-service delivery was tested.** The endpoint path was verified against a mocked service only; the mailto path hands off to the visitor's email client, which was not exercised.
* Only Chromium was automated. Firefox and Safari were not tested. No screen reader (NVDA, VoiceOver) testing was done; axe cannot catch everything.
* The sandbox had no internet, so Google Fonts could not load and pages were tested with fallback system fonts. The Google Fonts requests were excluded from the failed-request checks; every other request was checked.
* The browser "Print / Save as PDF" button opens the print dialog; the dialog itself and the generated PDF layout were not inspected.
* Real touch devices were not used; mobile was tested with 360/375/390 px emulated viewports.
* Charts rely on Canvas; the text summaries and "view chart data as a table" are the non-visual alternatives.
* Datasets are sized for demos (thousands of rows), not for large-data performance.
* Placeholder email and site URL must be replaced (see top).
* The About page shows nothing personal until you fill `about` in `js/config.js`; no credentials, clients or achievements are invented anywhere on the site.

## Licences

Chart.js is MIT licensed (`vendor/chart.umd.js`). Icons are hand-authored SVG paths. Fonts are loaded from Google Fonts under their open licences.
