/**
 * The content model and CMS settings for this site — the one file that grows
 * with the site. Everything (admin forms, validation, the Astro content
 * schema) is derived from it.
 */
export default {
  locales: ["en"],
  defaultLocale: "en",

  content: {
    // Local dev edits files on disk; the deployed Worker talks to GitHub.
    provider: process.env.GITHUB_CONTENT === "true" ? "github" : "fs",
    githubTokenEnv: "GITHUB_TOKEN",

    // Which repository holds the content. Normally you never touch these:
    // the build auto-detects the clone's own repo from its git remote
    // (worker/repo.json), and the GITHUB_REPO variable on the worker can
    // override at runtime. Fill them in only if content lives in a
    // DIFFERENT repository than this code.
    owner: "REPLACE_GITHUB_OWNER",
    repo: "REPLACE_GITHUB_REPO",

    branch: "main",
    // Saves land here; Publish moves pages onto `branch`. Created
    // automatically on first save. Without it, saving a live page would
    // publish it instantly.
    draftBranch: "cms-drafts",
    pagesDir: "src/pages-data",
    // Images the repo holds. The admin's picker browses and uploads here, and
    // the build resizes what the pages use — see the two pictures on /about.
    assetsDir: "src/assets",
    publishBranch: "main",
    // Publish stages these. The assets directory has to be here too, or an
    // image uploaded through the admin stays on the machine that received it.
    publishPaths: ["src/pages-data", "src/assets"],
        commitMessage: (ts) => `Content update ${ts}`,
    // The GitHub backend lists entries from per-collection _index.json
    // manifests. "lazy" bootstraps a missing manifest with one GraphQL call
    // and persists it — without this, the admin shows collections with
    // EMPTY entry lists until a build-index CLI run. Right default for
    // small sites; big collections should ship prebuilt indexes instead.
    list: { rebuild: "lazy" },
  },

  auth: {
    provider: "basic",
    users: [
      { user: "admin", passEnv: "ADMIN_PASS", role: "admin" },
    ],
  },

  // Contact form → email via Resend (https://resend.com — verify your domain
  // there, then set the RESEND_API_KEY secret).
  mail: { from: "Website <forms@example.com>" },
  forms: {
    contact: {
      to: "hello@example.com",
      subject: (fields) => `New message — ${fields["Name"] ?? "website"}`,
      replyTo: "Email",
      redirect: "/thanks/",
    },
  },

  // Media CDN — optional. Without it, images live in `assetsDir` above: the
  // picker lists and uploads them there, on disk locally and as commits to
  // this repo when deployed. A CDN is for a library that keeps growing.
  // media: { cdnBase: "https://cdn.example.com", tenantId: "your-tenant" },

  // Site-specific block: the contact form. The site's [...slug].astro maps
  // it to its own component; the editor just places it.
  blocks: {
    "contact-form": { label: "Contact form", properties: {}, defaults: {} },
  },

  collections: {
    pages: {
      label: "Pages",
      listFields: [{ key: "title" }, { key: "slug" }],
      metaFields: [
        { key: "title", label: "Title", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "parent", label: "Parent page (slug)", type: "text" },
        { key: "redirectFrom", label: "Old paths (301 here)", type: "string-list" },
      ],
      sort: { field: "title", direction: "asc" },
    },
  },
};
