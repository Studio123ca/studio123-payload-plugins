# Payload field test app

This is a small, generic Payload app for exercising every custom field in this package through Payload's real admin form and API. It uses the same Payload canary version as the package peer dependencies and a dedicated PostgreSQL service named `payload-fields-test-db`.

The app contains one authentication collection and one showcase collection with Code, Link, Color, Phone, Message, and a JSON Data Table. Playwright covers JSON clear/import/save behavior through Payload’s real admin form and API.

## Run it

From this directory, with Docker Compose v2 available:

```sh
npm install
npm run db:up
npm run test:e2e
npm run db:down
```

`db:down` removes only this Compose project's test database container. The service binds to `127.0.0.1:55432` and uses a fixture-only database name and credentials. The test app runs on `127.0.0.1:3210`.

If you already run a dedicated PostgreSQL service, create a database named `payload_fields_test`, set `PAYLOAD_TEST_DATABASE_URL` to its connection string, then run `npm run test:e2e`. The config refuses to start against any other database name.

Playwright global setup seeds an 11-row table. The test clears and saves it, confirms the API returns `null`, then imports a CSV and checks the unsaved grid and saved API value.
