# Kafo AI — Enhancement Plan

_Produced by task KAFO-001. Grounded in `docs/PROJECT_OVERVIEW.md` (same date). Effort: S = hours, M = 1–3 days, L = a week or more. Tiers: **Now** (do first), **Next** (after Now items land), **Later** (deliberate deferral)._

Every mandated candidate from the task brief appears below with an explicit **keep / defer / reject** verdict.

---

## 1. Repo hygiene — README, .gitignore, LICENSE decision — **KEEP — Now (S)**

**Rationale:** The repo has zero documentation (Overview fact f). Anyone touching it today cannot tell that `deploy/index.html` is a build artifact, that `support.js` is generated, or how the site gets published. A README stating the publish workflow, the external `dc-runtime` location, and the do-not-edit files is the cheapest, highest-leverage change and a prerequisite for safely doing anything else. Include a `.gitignore` (OS junk, editor files) and record an explicit LICENSE decision (likely proprietary/all-rights-reserved for a marketing site — the decision just needs to be written down).
**Risk/prereqs:** None. Pure documentation.
**Effort:** S.

## 2. Source of truth for the website — **KEEP — Now (M–L)**

**Rationale:** The only representation of the site is an opaque 726 KB bundle (fact d). Content changes are un-diffable and un-reviewable, and the bundler pipeline lives somewhere undocumented. Either bring the site source (or the mockup-to-bundle export pipeline) into this repo or a linked repo, or at minimum document the exact regeneration workflow (tool, inputs, command, who runs it). Everything in the SEO, performance, and i18n items below is throttled by this: you cannot iterate on a page you cannot edit.
**Risk/prereqs:** Requires locating the external bundler and `dc-runtime` projects. The documentation half is risk-free; importing the pipeline is M–L depending on its state.
**Effort:** S for documenting the workflow; M–L for importing the pipeline.

## 3. SEO & metadata — **KEEP — Now (decision) + Next (implementation) (M)**

**Rationale:** The deployed page's title is the placeholder "Bundled Page" (fact b), there is no meta description, Open Graph/Twitter cards, favicon, canonical URL, sitemap.xml, or robots.txt, and the entire site is `noindex, nofollow` via `vercel.json` (fact a). Notably, the site already **contains its own SEO plan as mockup content** (canonical/hreflang/sitemap-index/IndexNow sample markup is displayed inside the page) — the plan exists, it just is not implemented.
**Plan:** (1) **Now:** write down the launch criterion for removing `X-Robots-Tag` (e.g., "when real routes + metadata exist"), so de-indexing stays a conscious choice rather than a forgotten default. (2) **Next:** fix `<title>`, add meta description, OG/Twitter cards, favicon, canonical + hreflang (the mockups already specify EN/AR alternates), `sitemap.xml`, `robots.txt`.
**Risk/prereqs:** Implementation requires the source-of-truth item (#2) — metadata must be set in the bundler input, not hand-patched into the artifact. Removing noindex before content/structure is ready would index a placeholder-titled single page; do not remove it before #3 and #5 land.
**Effort:** M overall (S once #2 exists).

## 4. Progressive rendering / no-JS resilience — **KEEP — Next (M)**

**Rationale:** Without JavaScript the site is a blank page with a tiny `<noscript>` notice, and even with JS users see an "Unpacking..." state (fact c). Crawlers and link unfurlers that don't execute JS see nothing — which also undermines the SEO work in #3. Evaluate a static export / pre-rendered path: since the content is ultimately static marketing copy, emitting plain HTML (with fonts as normal font files) is both simpler and faster than the unpack-on-load design.
**Risk/prereqs:** Depends on #2 (needs the pipeline). A pre-rendered export may be the natural output of restructuring into real routes (#5), so coordinate rather than doing it twice.
**Effort:** M.

## 5. Mockup-to-production gap: real routes & information architecture — **KEEP — Next (L)**

**Rationale:** The LastTable, investor, and OmniRisk content (EN and AR) is already **in** the deployed bundle (fact g) — but as a single bundled page, not as the real site the mockups imply: `/en/products/omnirisk`, `/ar/products/omnirisk`, home, investor page, etc. (routes the page itself references). The work is structural: split the design-canvas presentation into actual pages with real URLs, navigation, and per-page metadata. Mockup sections to productionize: LastTable product page (hero, "Three connected systems", "The growth engine", FAQ), investor page ("Invest in the infrastructure of smarter finance.", portfolio by stage), OmniRisk product page, "Partner with Kafo AI", and the Arabic variants of each.
**Risk/prereqs:** Hard dependency on #2. This is the main content/engineering effort of the whole plan.
**Effort:** L.

## 6. Internationalization (EN/AR) — **KEEP — Next, folded into #5 (M)**

**Rationale:** Arabic RTL content already exists in both mockups and bundle (`lang="ar"`, `dir="rtl"` present), and the mockups specify IBM Plex Sans Arabic. What is missing is i18n **structure**: `/en/` and `/ar/` route trees, per-page `lang`/`dir` on the root element, hreflang alternates (the mockups even specify `x-default` → `/ar/`), a language switcher, and a deliberate Arabic font-loading strategy (self-hosted subset vs. Google Fonts).
**Verdict detail:** Keep, but execute as part of #5 rather than as a separate workstream — the route split and the locale split are the same cut.
**Risk/prereqs:** #2, #5.
**Effort:** M incremental on top of #5.

## 7. Performance — **KEEP — Next (S–M)**

**Rationale:** The single HTML file is ~726 KB, dominated by 30 embedded woff2 fonts (plus 3 embedded scripts and an ~88 KB template), all of which must download before anything renders and none of which can be cached independently. **Measured baseline (record before changing anything):** 725,668 bytes HTML; 33 embedded assets; blank-until-unpacked render. Candidate work: serve fonts as separate cacheable files with a trimmed subset (30 font files is almost certainly more weights/scripts than the design uses), add cache headers in `vercel.json` for static assets, and let the static-export work in #4/#5 eliminate the unpack step entirely.
**Risk/prereqs:** Font/asset splitting requires the pipeline (#2); the `vercel.json` cache-header addition is standalone and S. Do not hand-edit the artifact.
**Effort:** S for headers; M for the real restructuring (mostly subsumed by #4/#5).

## 8. Deployment & quality gates — **KEEP — Next (S–M)**

**Rationale:** Nothing validates a deploy today (fact f). Minimum viable gates: a CI check that `deploy/index.html` parses and contains the expected `__bundler/manifest` + `__bundler/template` blocks (integrity of the artifact), `vercel.json` JSON-syntax validation, and use of Vercel preview deployments for review before production. Also make an explicit decision on analytics and uptime monitoring (even "none for now" should be recorded in the README).
**Risk/prereqs:** None technical; a GitHub Actions (or Vercel checks) workflow is standalone. Becomes more valuable once #2 introduces a real build.
**Effort:** S–M.

## 9. Accessibility — **KEEP — Later (M)**

**Rationale:** Deferred, not rejected: the current page is a design presentation that will be rebuilt as real routes in #5, so auditing the bundled artifact in depth would be throwaway work. What to carry into #5 as requirements rather than fix now: a proper heading hierarchy per page (the bundle currently has multiple `h1`s from stacked mockup screens), `lang`/`dir` on the html element per locale, visible focus states, color-contrast checks against the dark navy/teal palette, and alt text for imagery. One exception worth doing early: the root `<html>` element should carry a correct `lang` once #3 touches the head.
**Risk/prereqs:** #5 (audit the real pages, not the artifact).
**Effort:** M, spread across #5.

## 10. Binary assets in git (`uploads/`) — **KEEP — Later (S)**

**Rationale:** 8 MB of PDF + screenshot sit in git history (fact e). They are reference material, not site assets. Options, in order of preference: move them out of the repo to shared storage and delete from the working tree; or track with Git LFS. Note that already-committed history keeps the bytes either way unless history is rewritten — with only 3 commits and (presumably) few clones, a one-time history rewrite is still cheap **today** and gets more expensive forever after, which is the one argument for promoting this to Next.
**Risk/prereqs:** History rewrite requires coordination with anyone who has cloned; trivial otherwise.
**Effort:** S.

## Rejected / explicitly not planned

- **Hand-editing `deploy/index.html` or `support.js` for any of the above** — rejected. Both are generated; all fixes go through the source-of-truth pipeline (#2).
- **Removing the `noindex, nofollow` header now** — rejected as an immediate action (kept as a *gated decision* inside #3): indexing a single page titled "Bundled Page" with no metadata would do SEO harm, not good.
- **Adding a JS test framework for the current repo contents** — rejected. There is no code to test in this repo today; quality gates arrive as artifact-integrity CI (#8) and real tests only once the pipeline (#2) brings testable source in.

---

## Execution order

**Now:** 1 (README/hygiene) → 2 (document, then import, the source-of-truth pipeline) → 3-part-one (write the noindex-removal launch criterion).
**Next:** 5 + 6 (real routes with EN/AR structure, built on the imported pipeline) → 3-part-two (full metadata, sitemap, robots, then remove noindex) → 4 (static/pre-rendered export, likely falling out of 5) → 7 (cache headers immediately; font splitting with the restructure) → 8 (CI integrity checks + preview-deploy convention).
**Later:** 9 (accessibility audit against the real pages, with requirements folded into 5) → 10 (move/LFS the uploads binaries — promote to Next if a history rewrite is desired while the repo is young).

**Recommended sequence in one paragraph:** Start with the free wins that make the repo legible (README, gitignore, documented publish workflow), because every other item depends on knowing how the bundle is produced. Then import the pipeline so the site becomes editable, and use that capability to do the one big structural piece — splitting the design-canvas page into real `/en/`–`/ar/` routes — since SEO metadata, pre-rendering, i18n, performance, and accessibility all land naturally on top of that structure and would be throwaway work against the current artifact. Only after real routes and metadata exist should the `noindex` header come off. CI gates and asset hygiene can proceed in parallel at any point.

**Suggested immediate follow-up tasks (cut-ready):**
1. Add README + `.gitignore` + LICENSE decision documenting artifacts, generated files, and publish workflow (#1).
2. Locate and document (or import) the bundler and `dc-runtime` pipelines (#2).
3. Add `vercel.json` cache headers for static assets and a CI job validating `deploy/index.html` integrity + `vercel.json` syntax (#7/#8).
4. Write the SEO launch checklist: title/meta/OG/favicon/canonical/hreflang/sitemap/robots plus the explicit noindex-removal criterion (#3).
5. Decide the fate of `uploads/` binaries while a history rewrite is still cheap (#10).
