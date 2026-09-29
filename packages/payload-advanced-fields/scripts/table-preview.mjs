import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, '.cache/table-preview');
await mkdir(output, { recursive: true });
await build({
  entryPoints: [resolve(root, 'tests/fixtures/preview.tsx')],
  outfile: resolve(output, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  alias: { '@payloadcms/ui': resolve(root, 'tests/fixtures/payload-ui.tsx') },
});
await writeFile(
  resolve(output, 'index.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Table field preview</title><link rel="stylesheet" href="/index.css"><style>
*{box-sizing:border-box}body{margin:0;background:#f2f3f4;font:14px/1.5 system-ui,sans-serif}main{max-width:1180px;min-height:100vh;margin:auto;padding:36px;background:#fff;color:#252525}main[data-dark=true]{--theme-elevation-0:#191919;--theme-elevation-50:#222;--theme-elevation-100:#303030;--theme-elevation-150:#414141;--theme-text:#ededed;--theme-success-500:#70ae99;background:#191919;color:#ededed}.preview-header{display:flex;align-items:center;justify-content:space-between;gap:20px}small{letter-spacing:.1em;opacity:.6}h1{font-size:32px;letter-spacing:-.04em;margin:8px 0}nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:20px 0 30px}nav button{padding:10px 16px;font:inherit;border:1px solid #aaa;border-radius:6px;background:transparent;color:inherit;cursor:pointer}nav button[aria-pressed=true]{background:#235f50;border-color:#235f50;color:white}pre{max-height:260px;overflow:auto;padding:16px;background:var(--theme-elevation-50,#f6f6f6);font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}.field-type>label{display:block;margin-bottom:8px;font-weight:600}
</style></head><body><div id="root"></div><script type="module" src="/index.js"></script></body></html>`,
);
const files = {
  '/': ['index.html', 'text/html'],
  '/index.js': ['index.js', 'text/javascript'],
  '/index.css': ['index.css', 'text/css'],
};
const server = createServer(async (request, response) => {
  const file = files[request.url?.split('?')[0] ?? '/'];
  if (!file) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.setHeader('Content-Type', file[1]);
  response.end(await readFile(resolve(output, file[0])));
});
server.listen(Number(process.env.TABLE_PREVIEW_PORT ?? 4178), '127.0.0.1', () =>
  console.log(`Table preview: http://127.0.0.1:${server.address().port}`),
);
