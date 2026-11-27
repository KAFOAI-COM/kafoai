# Kafo AI marketing site

This repository is the pre-launch Kafo AI marketing-site handoff. It contains the editable design document, externally generated release artifacts, hosting configuration, and reference uploads. It is not the source repository for the bundler or the `dc-runtime` TypeScript project.

## Source-of-truth and generated files

| Path | Status and ownership |
| --- | --- |
| `Kafo AI Mockups.dc.html` | **Editable design document** and content source for the mockup rendering workflow. |
| `deploy/index.html` | **Externally produced bundler artifact. Do not hand-edit.** Obtain a fresh export from the external bundler/source owner. |
| `support.js` | **Generated runtime. Do not hand-edit.** It is built from external `dc-runtime/src/*.ts`. |
| `deploy/vercel.json` | **Hand-authored hosting configuration** for the static deployment. |
| `uploads/` | Reference uploads, not deployed source. |

The generated files are committed release/reference content, not disposable build output. Do not reformat, patch, or regenerate them inside this repository.

## External regeneration handoff

There is no bundler, no `dc-runtime` TypeScript source, and no local command in this repository that can regenerate the deployment bundle. Obtain the external project/handoff rather than inventing a command or patching generated output.

To rebuild the runtime, in the external `dc-runtime` checkout run:

```sh
cd dc-runtime && bun run build
```

Copy the resulting `support.js` into this repository only after reviewing the generated diff. Regenerate `deploy/index.html` through the external bundler/source owner and copy the exported artifact; never hand-edit either generated file. Confirm that the export is intentional before publishing.

## Vercel publish workflow

Vercel serves the `deploy/` directory as the static site. The committed `deploy/vercel.json` enables clean URLs and intentionally applies the global `X-Robots-Tag: noindex, nofollow` header before launch. Do not remove that pre-launch protection as part of a bundle update.

After external regeneration:

1. Review the generated-file diff and confirm the change came from the external source owner.
2. Run the local checks below.
3. Publish through the linked Vercel project's configured preview/production flow.
4. Validate the preview, then promote or merge according to that project's settings.

The repository does not prove the Vercel account linkage, project identifier, automatic deployment triggers, preview policy, or production-promotion settings. Confirm those external settings with the project owner rather than guessing.

## Local verification

From the repository root, run the dependency-free policy suite and structural checks:

```sh
node --test tests/repository-hygiene.test.mjs
node --check support.js
node -e "JSON.parse(require('node:fs').readFileSync('deploy/vercel.json', 'utf8'))"
git diff --check
```

The policy suite checks the generated-file boundaries, bundler markers in `deploy/index.html`, and the Vercel configuration. For a direct marker check, the three expected script types are `__bundler/manifest`, `__bundler/template`, and `__bundler/page_order`.

For an optional visual check, serve the deployment directory locally:

```sh
python3 -m http.server 8000 --directory deploy
```

Local serving is a supplemental visual check, not an automated acceptance test. Before handing off a release, also confirm that `git diff --exit-code -- deploy/index.html support.js` succeeds and that neither protected generated file was changed accidentally.

## License

This is proprietary pre-launch material owned by Raya Software Limited. It is confidential and all rights reserved; no public-use or open-source permission is granted. See [`LICENSE`](LICENSE) for the repository's explicit use restrictions.
