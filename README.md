# Stelstone Starter

An Astro site and the [Stelstone](https://github.com/natilon/stelstone) admin panel,
deployed as **one Cloudflare Worker**. Every record is a JSON file in this
repo, every publish is a git commit, and an editor can't break the site:
saving doesn't publish, internal links are picked from a list and verified at
build, moved pages keep their old paths as real 301s.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/natilon/stelstone-starter)

## After the deploy button: two secrets, and you're done

The button clones this repo into your GitHub account (any name you pick —
the build auto-detects it), connects builds so **every push to `main`
redeploys**, and deploys the Worker. The site is live immediately; the
admin needs two secrets it cannot invent for you:

### 1. Create a GitHub token (this is how the CMS writes your content)

GitHub → Settings → Developer settings → Personal access tokens →
[**Fine-grained tokens**](https://github.com/settings/personal-access-tokens)
→ Generate new token:

- **Repository access:** *Only select repositories* → your clone
- **Permissions → Repository permissions → Contents:** *Read and write*

Copy the token — you'll paste it in the next step.

### 2. Add the secrets to the Worker

In the Cloudflare dashboard: **Workers & Pages → your worker → Settings →
Variables and Secrets → Add**, type **Secret**:

| Name             | Value                                   |
| ---------------- | --------------------------------------- |
| `GITHUB_TOKEN`   | the token from step 1                   |
| `ADMIN_PASS`     | the admin panel password you choose     |
| `RESEND_API_KEY` | *optional* — contact-form delivery ([resend.com](https://resend.com); also set `mail.from` in `cms.config.mjs`) |

Secrets take effect immediately — no redeploy needed. Prefer the terminal?
`npx wrangler secret put GITHUB_TOKEN -c worker/wrangler.jsonc` does the same.

Until `ADMIN_PASS` exists the Worker's API answers `503` ("CMS is not
configured … set ADMIN_PASS") whatever else is set, on purpose: without a
password the CMS would let every request in as admin, and with
`GITHUB_TOKEN` beside it that is write access to your repo. The site itself
stays up. Add the secrets in either order.

**Verify:** open `https://<your-worker>.workers.dev/admin/` and sign in as
`admin` with your `ADMIN_PASS`.

> **Troubleshooting:** if the admin says it can't reach the content repo,
> add a plain variable `GITHUB_REPO` = `your-user/your-repo` next to the
> secrets — that overrides the build-time auto-detection.

## Five things to try first

1. **Edit the homepage** — change a paragraph, hit *Save*. The live site
   doesn't move: saves land on the `cms-drafts` branch.
2. **Publish page** — now it's live. One page went out; nothing else did.
3. **The draft** — "Style notes" exists in the admin and nowhere on the site.
   Flip its draft toggle and publish to take it live.
4. **Visit `/old-web-design`** — a real 301 to `/services/web-design/`,
   generated from the page's "Old paths" field.
5. **Break a link — try to.** Internal links are picked from a page list;
   `npm run build` verifies every one and names the page if something's off.

## Local development

```bash
npm install
cp .env.example .env          # set ADMIN_PASS
npm run dev                   # site + /admin on one origin, content on disk
```

Local dev edits the JSON files directly (the `fs` backend); the deployed
Worker talks to GitHub. Same admin, same content model.

```bash
npm run preview               # build + run the real Worker locally (wrangler dev)
npm run deploy                # build + deploy to Cloudflare
```

## Manual deploy (no button)

```bash
npm install
# set the secrets listed above
npm run deploy
```

**Optional — page templates** (reusable block sets in the admin). Everything
works without this; the templates list is just empty:

```bash
npx wrangler kv namespace create TEMPLATES_KV
# → uncomment kv_namespaces in worker/wrangler.jsonc with the printed id
npm run deploy
```

## How it fits together

```
src/pages-data/    content — one JSON file per page, edited by the admin
cms.config.mjs     the content model: collections, fields, blocks, forms
src/pages/         Astro templates rendering the content
worker/index.mjs   ONE worker: redirects → /api (CMS) → /admin (SPA) → site
```

The build (`npm run build`) outputs the static site to `dist/`, copies the
admin SPA to `dist/admin/`, and writes the redirect map to
`worker/redirects.json`. Files that exist are served by Cloudflare's asset
layer without running the worker; everything else — the API, redirects, the
404 page — is the worker's job.

## Custom domain

Workers → your worker → Settings → Domains & Routes → add your domain.
`workers.dev` is for trying things out, not for shipping.
