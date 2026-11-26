# Kafo AI — Project Overview

_Produced by task KAFO-001 (study + enhancement plan). Analysis date: 2026-11-26._

This repository holds the **Kafo AI marketing-site project** in its current pre-production form: a single pre-bundled static web page deployed to Vercel, a design-mockup document, the generated runtime that renders that document, and two uploaded business/design assets. There is **no website source code, no build tooling, no tests, and no README** in the repository. Git history is 3 commits (initial import, a legal-entity footer update naming Raya Software Limited, Dublin, Ireland, and its merge).

## Repository inventory

| Path | Size | Provenance | Purpose |
|---|---|---|---|
| `deploy/index.html` | ~726 KB (725,668 bytes) | **Build artifact** — produced by an external "bundler" tool; do not hand-edit | The entire public website as one self-contained HTML file. Contains an unpacking loader script, an embedded JSON manifest of 33 assets (3 `text/javascript` entries, 30 `font/woff2` entries), an embedded page template (~88 KB of serialized markup), and an (empty) `__bundler/page_order` block for nested-page iframe relaying. On load, JavaScript parses the manifest, mints blob/data URLs for the embedded assets, and replaces the document with the real page. |
| `deploy/vercel.json` | 170 B | Hand-authored config | Vercel static-hosting config: `cleanUrls: true` plus a **global `X-Robots-Tag: noindex, nofollow` header on every route** — the whole site is deliberately hidden from search engines. |
| `Kafo AI Mockups.dc.html` | ~75 KB | Hand-authored design document | A design-canvas ("dc") mockup file using an `<x-dc>` template with `sc-for`/`sc-if` directives (34 occurrences). Covers LastTable product pages (EN desktop + Arabic RTL mobile), investor pages, OmniRisk product page, systems grid, FAQ, and pricing copy. Rendered in a browser via `./support.js`; loads IBM Plex Sans / IBM Plex Sans Arabic / IBM Plex Mono / Instrument Serif from Google Fonts. |
| `support.js` | ~69 KB (1,911 lines) | **Generated — do not edit.** Header: `GENERATED from dc-runtime/src/*.ts — do not edit. Rebuild with 'cd dc-runtime && bun run build'` | The dc-runtime: parses `<x-dc>` documents and renders them with React (expects `window.React` / `window.ReactDOM`). The `dc-runtime` source project is **not in this repository**, so `support.js` cannot be rebuilt from here. |
| `uploads/LastTable UAE Investor Deck.pdf` | 6.7 MB | Uploaded binary asset | Business context: investor deck for LastTable (UAE). |
| `uploads/Screenshot 2026-10-22 at 12.18.18.png` | 1.6 MB | Uploaded binary asset | Design reference screenshot. |

Total committed binary weight in `uploads/`: **~8.0 MB**, stored directly in git (no LFS).

## Architecture in plain terms

1. **The website is a pre-bundled artifact, not a project.** `deploy/index.html` is the output of a bundler toolchain that is not present here. The repo contains no source pages, components, or build pipeline for the site — editing the site means regenerating this 726 KB file somewhere else and committing the result.
2. **Unpack-on-load rendering.** The shipped HTML shows only a "K" thumbnail and an "Unpacking..." badge until JavaScript runs. The loader reads the embedded `__bundler/manifest` and `__bundler/template` script blocks, converts assets (mostly woff2 fonts, inlined as data) into blob URLs, and swaps in the real document. **Without JavaScript the page is blank** apart from a small `<noscript>` notice ("This page requires JavaScript to display."). The loader also implements a nested-page blob relay for iframe sub-pages, but `__bundler/page_order` is currently an empty array — this deployment is a **single page with no sub-pages**.
3. **Hosting:** Vercel static hosting of the `deploy/` directory. `cleanUrls` is on; every response carries `X-Robots-Tag: noindex, nofollow`.
4. **Mockup workflow:** design work happens in `*.dc.html` documents rendered by the generated `support.js` runtime. The dc-runtime source lives in an external `dc-runtime/` project built with `bun`; only its compiled output is committed here.
5. **The deployed page is effectively a rendered export of the mockups.** The bundle template's headings match the mockup document's headings almost one-to-one (LastTable hero, "Three connected systems", "The growth engine", FAQ, investor pages "Invest in the infrastructure of smarter finance.", Arabic equivalents, OmniRisk, "Partner with Kafo AI"). The site is a single-page design presentation, not yet a multi-page production website with real routes.

## Key facts driving enhancement priorities

- **(a) The entire public site is de-indexed.** `deploy/vercel.json` applies `X-Robots-Tag: noindex, nofollow` to `/(.*)` — intentional for a pre-launch site, but it must be consciously removed at launch or the site will never rank.
- **(b) Placeholder title.** The deployed page's `<title>` is literally **"Bundled Page"** — that is what appears in browser tabs, bookmarks, and link previews.
- **(c) JavaScript is mandatory.** The unpack-on-load design renders nothing without JS (blank page + `<noscript>` notice) and shows a visible "Unpacking..." state even with JS. No pre-rendered content exists for crawlers, link unfurlers, or slow devices.
- **(d) No source of truth in this repo.** The only representation of the website is the opaque 726 KB bundle. Content changes are neither reviewable nor diffable; the bundler pipeline lives outside the repo and is undocumented.
- **(e) ~8 MB of binaries committed to git.** `uploads/` holds a 6.7 MB PDF and a 1.6 MB screenshot directly in history; every clone pays this cost forever.
- **(f) Zero project hygiene.** No README, LICENSE, `.gitignore`, package.json, CI, tests, or lint configuration exist anywhere in the repo.
- **(g) Mockup-to-production status.** Grepping `deploy/index.html` for `lasttable` finds **29 mentions** — the LastTable content (EN and AR, `dir="rtl"` and `lang="ar"` attributes present) **is** in the deployed bundle. The gap is not missing content but missing **structure**: everything lives in one bundled page instead of real routes (`/en/…`, `/ar/…`). Notably, the canonical/hreflang/sitemap markup visible inside the bundle is **displayed sample code within an SEO-plan mockup section**, not actual `<head>` tags — the real document head has no meta description, Open Graph/Twitter tags, favicon, canonical link, or hreflang alternates.
- **(h) External network dependencies.** The mockup document loads fonts from `fonts.googleapis.com`; the deployed bundle embeds its 30 woff2 fonts inline instead (self-contained but heavy).

## Generated / do-not-edit files

- `support.js` — generated from the external `dc-runtime` project (`cd dc-runtime && bun run build`); the source is not in this repo, so it cannot currently be rebuilt here.
- `deploy/index.html` — bundler output; hand-edits would be overwritten by the next export and are effectively unreviewable.

## Deployment model

Vercel serves `deploy/` statically. There is no CI validation, no preview-deployment convention documented, and no analytics or uptime monitoring in evidence. The publish workflow (how a new bundle gets produced and lands in `deploy/`) is undocumented.

## Related documents

- `docs/ENHANCEMENT_PLAN.md` — the prioritized enhancement plan derived from this study.
