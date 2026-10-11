/* ==========================================================================
   Central site configuration.  Edit this file to rebrand the site, change
   prices, switch the contact method, or update the About section.
   Nothing in here is a secret: this file is shipped to the browser.
   ========================================================================== */
window.IF_CONFIG = {
  brand: {
    name: "InsightFlow Analytics",
    shortName: "InsightFlow",
    tagline: "Business data analysis, dashboards and reporting automation",
    // Used for the mailto: contact method and shown on the contact page.
    // Replace with your real, monitored address before publishing.
    email: "hello@example.com",
    siteUrl: "https://www.example.com" // used only for sitemap/OG docs; see README
  },

  /* ------------------------------------------------------------------
     Contact form delivery.
       method: "mailto"  -> opens the visitor's email app with the inquiry
                            pre-filled. Nothing is "sent" by the website.
       method: "endpoint"-> POSTs JSON to a serverless form service you
                            control (Formspree, Getform, Netlify Forms proxy,
                            your own function...). The success message is
                            shown only when that service answers 2xx.
     Never put API secrets here. Use an endpoint URL that is designed to be
     public (e.g. a Formspree form URL) and enable its spam protection.
     ------------------------------------------------------------------ */
  contact: {
    method: "mailto",
    endpoint: "" // e.g. "https://formspree.io/f/xxxxxxx"
  },

  /* Pricing: starting points, editable. Currency is USD. */
  pricing: {
    currency: "USD",
    scopeNote:
      "Prices are starting points. The final quote depends on dataset size, data complexity, required integrations, security requirements and the deliverables you need. Revisions, datasets and turnaround are agreed in writing before work starts; nothing is unlimited or guaranteed by default.",
    packages: [
      {
        id: "cleanup", name: "Data Cleanup", tag: "Starter",
        price: 25, prefix: "Starting at", suffix: "",
        blurb: "A tidy, documented version of one small messy dataset.",
        items: [
          "One small CSV or Excel dataset",
          "Data quality checks",
          "Duplicate and missing-value report",
          "Cleaned output file",
          "Summary of changes"
        ]
      },
      {
        id: "insights", name: "Business Insights", tag: "Analysis",
        price: 59, prefix: "", suffix: "",
        blurb: "Exploratory analysis and a written report for one agreed dataset.",
        items: [
          "One agreed dataset",
          "Data cleaning as needed",
          "Exploratory analysis",
          "Key charts and metrics",
          "Written findings",
          "A concise PDF or HTML report"
        ]
      },
      {
        id: "dashboard", name: "Interactive Dashboard", tag: "Most requested", featured: true,
        price: 129, prefix: "", suffix: "",
        blurb: "One custom dashboard built around the KPIs you agree on.",
        items: [
          "One custom dashboard",
          "Agreed KPIs",
          "Interactive filters",
          "Charts and tables",
          "Sample-data or client-data configuration",
          "Basic usage documentation"
        ]
      },
      {
        id: "monthly", name: "Monthly Analytics", tag: "Recurring",
        price: 99, prefix: "From", suffix: "/month",
        blurb: "A recurring review and report for a defined number of cycles.",
        items: [
          "Recurring data review",
          "Monthly performance report",
          "Agreed KPI tracking",
          "Dashboard updates",
          "A defined number of reporting cycles and revisions"
        ]
      }
    ]
  },

  /* About section. Leave a field empty ("" or []) to hide it. Nothing here
     is invented: fill in only what is true and verifiable. */
  about: {
    biography: "",
    qualifications: [],
    yearsOfExperience: "",
    clientHistory: "",
    certifications: []
  }
};
