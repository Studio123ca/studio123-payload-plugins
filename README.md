# studio123-payload-plugins

Monorepo for reusable Payload plugins and fields.

## Packages

- `@studio123/payload-advanced-fields`

## Development

```sh
npm install
npm run build
npm test
npm run typecheck
npm run format
npm run format:check
```

Prettier is configured at the workspace root for consistent TypeScript, JavaScript, JSON, CSS, and Markdown formatting. Generated output, dependencies, and the npm lockfile are excluded.

## Field previews

Use Node.js 22.12+ and run Storybook from the fields package to preview all advanced fields with editable props, light/dark themes, and live values:

```sh
cd packages/payload-advanced-fields
npm run storybook
```

See the [Storybook guide](packages/payload-advanced-fields/storybook/README.md) for examples, fixtures, and build commands.
