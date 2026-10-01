import { test, expect } from '@playwright/test';

const email = 'admin@example.test';
const password = 'payload-fields-test-password';

test('renders all plugin fields and imports CSV after saving a cleared JSON table', async ({ page, request }) => {
  test.setTimeout(60_000);
  const listResponse = await request.get(
    `/api/field-showcases?where[title][equals]=Data%20Table%20import%20regression&limit=1&depth=0`,
  );
  expect(listResponse.ok()).toBeTruthy();
  const id = (await listResponse.json()).docs[0]?.id;
  expect(id, 'global setup seeds the showcase document').toBeTruthy();
  const initialResponse = await request.get(`/api/field-showcases/${id}?depth=0`);
  expect(initialResponse.ok()).toBeTruthy();
  const initial = await initialResponse.json();
  expect(initial.codeExample).toContain('const answer = 42;');
  expect(initial.linkExample.external).toBe('https://payloadcms.com');
  expect(initial.colorExample.hex).toBe('#336699');
  expect(initial.phoneExample.number).toBe('+14165550123');

  await page.goto('/admin/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await expect(page).toHaveURL(/\/admin(?:\/)?$/);

  await page.goto(`/admin/collections/field-showcases/${id}`);
  const jsonField = page.locator('#field-tableExample');
  await expect(page.getByRole('textbox', { name: 'Code field' })).toBeVisible();
  await expect(page.getByText('This message field is rendered by the plugin.')).toBeVisible();
  await expect(page.getByText('Link field', { exact: true })).toBeVisible();
  await expect(page.getByText('Color field', { exact: true })).toBeVisible();
  await expect(page.getByText('Phone field', { exact: true })).toBeVisible();
  await expect(jsonField.getByRole('table', { name: 'Data table' })).toBeVisible();
  await expect(jsonField.getByRole('table', { name: 'Data table' }).getByRole('row')).toHaveCount(12);
  await expect(jsonField.getByRole('table', { name: 'Data table' }).getByText('2.001s', { exact: true })).toHaveCount(4);

  await jsonField.getByRole('menubar', { name: 'Data table actions' }).getByRole('menuitem', { name: 'Table' }).click();
  await page.getByRole('menuitem', { name: 'Clear table' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear table' }).click();
  await expect(jsonField.getByRole('button', { name: 'Create Table' })).toBeVisible();
  const clearSave = page.waitForResponse(
    (response) => response.url().includes(`/api/field-showcases/${id}`) && response.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Save' }).click();
  expect((await clearSave).ok()).toBeTruthy();

  const cleared = await request.get(`/api/field-showcases/${id}?depth=0`);
  expect(cleared.ok()).toBeTruthy();
  expect((await cleared.json()).tableExample).toBeNull();

  await jsonField.getByRole('button', { name: 'Create Table' }).click();
  await jsonField.getByLabel('Import CSV').setInputFiles({
    name: 'experiment-data.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Bounce #,Surface,Undergrounds\n1,2.010s,2.008s\n2,2.041s,2.008s\n3,2.008s,2.038s\n4,2.009s,2.008s\n5,2.039s,2.039s\n6,2.049s,2.037s\nAverage,2.025s,2.015s',
    ),
  });

  await expect(page.getByRole('columnheader', { name: /Undergrounds/ })).toBeVisible();
  // The editor evaluates numeric-looking duration cells for display, which trims trailing zeros.
  await expect(page.getByText('2.01s', { exact: true })).toBeVisible();
  const importSave = page.waitForResponse(
    (response) => response.url().includes(`/api/field-showcases/${id}`) && response.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Save' }).click();
  expect((await importSave).ok()).toBeTruthy();

  const saved = await request.get(`/api/field-showcases/${id}?depth=0`);
  expect(saved.ok()).toBeTruthy();
  const document = await saved.json();
  expect(document.tableExample.columns.map((column: { label: string }) => column.label)).toEqual([
    'Bounce #',
    'Surface',
    'Undergrounds',
  ]);
  expect(document.tableExample.rows).toHaveLength(7);
  expect(
    document.tableExample.rows[0].cells.map((cell: { value?: string } | string) =>
      typeof cell === 'string' ? cell : cell.value,
    ),
  ).toEqual(['1', '2.010s', '2.008s']);
});
