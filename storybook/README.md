# Field Storybook

Use Node.js 22.12+ (Node 24 recommended), then run from the repository root:

```sh
npm install
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

```sh
npm run typecheck
npm test
npm run storybook:build
npm run format:check
```

The static build goes into the ignored `storybook-static/` directory. Serve it over HTTP to allow the MSW worker to run. `storybook:build` compiles stories; it does not execute their interaction checks. Open Spreadsheet, Structured, and Menus in the browser to run those checks. No automated browser test runner is installed.

To add a field example, create a `*.stories.tsx` file here, reuse `PayloadField` and common controls, and add explicit fixture API handlers where necessary. Keep stories and backend fixtures outside published packages. After upgrading MSW, regenerate its worker with `npx msw init .storybook/public --save`.

Data Table also includes formulas, formats, sticky rows, read-only, and required examples. Format and sticky-row controls mirror the field configuration, and `maxHeight` mirrors `admin.maxHeight`. Fields are listed alphabetically.
