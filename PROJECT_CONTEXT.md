# Project Context — Zildjian Artist Form

Read this first. It records everything set up so far, so work can continue on any device.
Last updated: 2026-10-06.

## How to work with the owner (Ankush, ankush@bluestout.com)

- New to Shopify app deployment. Guide step by step, one screen at a time, with exact text to paste.
- The owner makes file edits themselves. Do not edit project files unless explicitly asked; reading files to verify is fine.
- Ask for a screenshot or terminal output before moving to the next step.

## What the app does

Artists fill in a profile form on zildjian.com. Each submission becomes a **draft blog post** in the store:
title "Name — Band", tags `artist-profile`, `draft-submission`, profile photo as featured image, details as `artist.*` metafields
(band, artist_type, role, country, quote, socials, videos, credits/rights, `cymbal_setup` and `go_tos` product references, `cymbal_setup_manual`).

Three parts:

| Part | Folder / file | Runs on | Goes live with |
| --- | --- | --- | --- |
| Form (theme app extension block "Artist Form") | `extensions/artist-form/` (blocks/artist-form.liquid, assets/artist-form.css, assets/artist-form.js) | Shopify | `shopify app deploy --config shopify.app.zildjian-artist-form.toml` |
| Server (React Router + Prisma) | `app/` — key routes `app/routes/submit.jsx`, `app/routes/search.jsx`, `app/routes/app._index.tsx` | Render | `git push` (Render auto-deploys) |
| App settings | `shopify.app.zildjian-artist-form.toml` | Shopify | `shopify app deploy --config ...` |

The form calls the server through the Shopify **App Proxy**: `/apps/artist-form/search?q=&group=cymbals|gotos&after=` and `/apps/artist-form/submit` (POST JSON).
Search: `group=cymbals` filters `product_type:Cymbals`; 24 per page with cursor pagination.

## Live setup (done on 2026-10-06)

| Item | Value |
| --- | --- |
| Store | zildjianshop.myshopify.com (storefront zildjian.com) |
| Shopify app | "Zildjian Artist Form", Partner org **Blue Stout**, **custom distribution** to zildjianshop (multi-store for its Plus org ticked) |
| Client ID | b01b81d7894729994eaefd5a1ef6a07e |
| Client secret | NOT stored here. In Render → Environment and dev.shopify.com → app → Settings. It was exposed in a screenshot once — rotate it and update Render. |
| Config file to use | `shopify.app.zildjian-artist-form.toml` (always pass `--config`) |
| Scopes | read_products, write_products, read_content, write_content, read_files, write_files |
| Server | https://zild-artist-form.onrender.com — Render Web Service `zild-artist-form`, **free plan**, Node runtime, region Ohio |
| Render build / start | `npm install && npm run build` / `npm run docker-start` |
| Render env vars | SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, SHOPIFY_APP_URL, NODE_VERSION=22 (optional SHOPIFY_BLOG_ID) |
| GitHub | https://github.com/ankush-bluestout/Zildjian-final (private, branch main) |
| Local folder (original PC) | D:\Final\zildzian artist form\zild-artist-form |
| Theme | Draft theme "Zildjian - Blue Stout- Artist" with page template `artist_form` containing the Artist Form block |
| App versions released | zildjian-artist-form-2 (first), -3 (added `main-layout` class) |

Verified working: `https://zildjian.com/apps/artist-form/search?group=cymbals` returns real Zildjian products.
Pending at time of writing: a full test submission (check Content → Blog posts for the draft).

## Decisions and why

- **Render, Node runtime (not Docker):** the Dockerfile runs `npm ci`, but `.gitignore` excludes `package-lock.json`, so a Docker build would fail.
- **Free plan + SQLite, no Postgres:** owner chose $0 and no file changes for now. Consequence: SQLite is on Render's ephemeral disk, so every sleep/restart/redeploy wipes the store's offline access token. **Fix after each redeploy: open zildjianshop admin → Apps → Zildjian Artist Form once** (the `authenticate.admin` loader in `app/routes/app._index.tsx` saves the token again). Long-term fix: Render Starter ($7) and/or Postgres (`prisma/schema.prisma` provider → postgresql, `url = env("DATABASE_URL")`, regenerate migrations).
- **Old apps deleted:** client IDs `79eb48ad...` and `bac58543...` no longer exist. `shopify.app.toml` and `shopify.app.zild-artist-form.toml` are leftovers — do not deploy with them (the latter was overwritten with the new app's content by mistake, so it now duplicates the correct file).
- **`automatically_update_urls_on_dev = false`** so `shopify app dev` cannot overwrite live URLs. Never run `shopify app dev` against this live app.
- **Removed the template "Create a test product" button** from `app/routes/app._index.tsx` (it created real snowboard products). Kept the `loader` with `authenticate.admin(request)`.

## Known gaps / ideas

- Both `profilePhoto` and `setupPhoto` are uploaded to Shopify Files by `submit.jsx`; the profile photo is used as the article image and the setup photo is saved to the `Cymbal Setup Image` article metafield.
- Photos are sent as base64 in JSON; large images may be slow or time out on the free plan.
- `extensions/artist-form/blocks/artist-form.liquid` loads Google Fonts remotely (deploy shows harmless "RemoteAsset" warnings).
- Suggested Render Build Filter: ignore `extensions/**` and `*.toml` so form-only pushes do not redeploy the server.

## How to make changes

1. `git pull` first (especially on another device).
2. Edit and save.
3. Form or `.toml` → `shopify app deploy --config shopify.app.zildjian-artist-form.toml` → "Yes, release".
   Server (`app/`) → push; wait for Render "Deploy live"; open the app once in admin.
   Env vars → Render → Environment → Save; open the app once in admin.
4. `git add .` → `git commit -m "..."` → `git push`.
Undo: form/settings → dev.shopify.com → Versions → release previous; server → Render → Events → Rollback.

## Another device

Install Node.js 22, Git, VS Code, `npm install -g @shopify/cli@latest`; then
`git clone https://github.com/ankush-bluestout/Zildjian-final.git`, `cd Zildjian-final`, `npm install`.
First `shopify app deploy` asks to log in — pick org Blue Stout.

## Another store

Custom distribution limits this app to zildjianshop and its Plus organization.
- Same Plus org: reuse the install link from Partners → app → Distribution.
- Any other store: new app (`shopify app config link` → new app → new toml), new Render service from the same repo with the new app's key/secret/URL, fill the new toml (copy this one, change client_id, name, URLs), deploy with its `--config`, custom distribution for that store, install, then theme block + page + blog.
  Form changes then need one deploy per store's toml; server changes reach all stores with one push.

## Guides created (owner's copies)

- Online docs (claude.ai):
  - How to Make Changes — https://claude.ai/code/artifact/cf524bd6-17c1-4c44-bf6e-cb5011561519
  - Using a Different Device — https://claude.ai/code/artifact/4b05c230-e0be-402d-924c-87b3b63f38cc
  - Complete Setup Guide — https://claude.ai/code/artifact/56099e46-967b-4810-8556-1d9da392e167
  - Installing on Another Store — https://claude.ai/code/artifact/f05b43cb-3498-4f03-972d-2badc3785b67
- PDFs on the original PC in D:\Final\ (same names).
