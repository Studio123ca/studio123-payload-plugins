# Field Storybook

Use Node.js 22.12+ (Node 24 recommended), install dependencies from the repository root, then start Storybook from the fields package:

```sh
npm install
cd packages/payload-advanced-fields
npm run storybook
```

Open http://127.0.0.1:6006. Storybook replaces the previous standalone Table preview.

## Exploring fields

The sidebar contains Table, Color, Code, Link, and Phone stories. Use **Controls** to change props, the toolbar to switch light/dark themes or English/French content locales, and **Reset example** to restore a fixture. Changing controls resets the form. The current value panel shows the live JSON value (including a JSON-escaped string for CSV storage).

Table includes content JSON, CSV storage, spreadsheet formulas, structured native fields, read-only, and required examples. Spreadsheet, Structured, and Menus stories include interaction checks in the Interactions panel. Color has picker variants; Code has HTML/text; Link has external/internal/email examples; Phone includes extensions, national format, and invalid input. Enable `showError` and click **Show server error** to inspect error styling. The Accessibility panel runs Storybook's accessibility checks.

## How it works

`.storybook/main.ts` generates a sanitized Payload client config in Node and supplies it through a Vite virtual module. Stories import field source directly, so edits update without rebuilding packages. The harness in `support/PayloadField.tsx` uses the canary's actual RootProvider, Form, router adapter, and native field controls. Local form state is seeded from story args; structured rows receive the local hydration normally supplied by the server.

MSW intercepts fixture auth, preferences, and relationship requests using `support/api.ts` and the generated worker in `.storybook/public`. No CMS or database is needed. The sample Pages collection contains three fixtures. Add handlers when a story needs another API response; unsupported fixture backend actions return 501. The router adapter does not navigate to real admin pages. Content locale switching resets the example and does not simulate persisted translations; admin labels remain English.

These stories preview UI and client interactions. Database persistence, access enforcement, server validation/hooks, uploads, and document editing flows still need verification in a consuming Payload app. Do not treat story fixture permissions as security tests.

## Verification and builds

Run these commands from `packages/payload-advanced-fields`:

```sh
npm run typecheck
npm test
npm run storybook:build
```

Storybook configuration, stories, fixtures, and development dependencies belong to `packages/payload-advanced-fields`. Run its scripts directly from that package directory. Repository-wide formatting is checked separately with `npm run format:check` from the repository root.

The static build goes into the ignored `packages/payload-advanced-fields/storybook-static/` directory. Serve it over HTTP to allow the MSW worker to run. `storybook:build` compiles stories; it does not execute their interaction checks. Open Spreadsheet, Structured, and Menus in the browser to run those checks. No automated browser test runner is installed.

To add a field example, create a `*.stories.tsx` file here, reuse `PayloadField` and common controls, and add explicit fixture API handlers where necessary. Stories and backend fixtures are excluded from the published npm package by its `files` allowlist. After upgrading MSW, run `npx msw init .storybook/public --save` from `packages/payload-advanced-fields` to regenerate its worker.

Data Table also includes formulas, formats, sticky rows, read-only, and required examples. The Paginated API story uses the 1,000-record CSV, a row-backed storage manifest, and the shared row-page helper to show the same bounded response shape used by the Payload endpoint; it remains an in-memory fixture because Storybook has no database. Format and sticky-row controls mirror the field configuration, and `maxHeight` mirrors `admin.maxHeight`. Fields are listed alphabetically.

## GitHub Pages

The repository workflow `.github/workflows/storybook.yml` builds Storybook from this package and deploys `storybook-static/` on pushes to `main`. It can also be started manually from the Actions tab. In repository Settings → Pages, set Source to **GitHub Actions**.

The default site URL is https://studio123ca.github.io/studio123-payload-plugins/. Static fixture and MSW worker URLs are relative so they work under the repository path as well as locally.
