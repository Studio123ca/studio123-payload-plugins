import { getPayload } from 'payload';
import config from '../src/payload.config.js';

export default async function globalSetup() {
  const payload = await getPayload({ config });
  const email = process.env.PAYLOAD_TEST_EMAIL ?? 'admin@example.test';
  const password = process.env.PAYLOAD_TEST_PASSWORD ?? 'payload-fields-test-password';
  const userResult = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });
  let user = userResult.docs[0];
  if (!user)
    user = await payload.create({
      collection: 'users',
      data: { email, password, name: 'Fixture Admin' },
      overrideAccess: true,
    });

  const existing = await payload.find({
    collection: 'field-showcases',
    where: { title: { equals: 'Data Table import regression' } },
    limit: 1,
    overrideAccess: true,
  });
  for (const doc of existing.docs)
    await payload.delete({ collection: 'field-showcases', id: doc.id, overrideAccess: true });

  const columns = [
    { id: 'old-bounce', label: 'Bounce #' },
    { id: 'old-surface', label: 'Surface' },
    { id: 'old-underground', label: 'Underground' },
  ];
  const oldData = [
    ['1', '2.001s', '2.001s'],
    ['2', '2.041s', '2.041s'],
    ['3', '2.008s', '2.008s'],
    ['4', '2.009s', '2.009s'],
    ['5', '2.039s', '2.039s'],
    ['6', '2.001s', '2.001s'],
    ['7', '2.041s', '2.041s'],
    ['8', '2.008s', '2.008s'],
    ['9', '2.009s', '2.009s'],
    ['10', '2.039s', '2.039s'],
    ['Average', '2.024s', '2.024s'],
  ];
  const tableExample = {
    version: 1,
    columns,
    rows: oldData.map((cells, index) => ({
      id: `old-row-${index + 1}`,
      cells,
    })),
  };
  const showcase = await payload.create({
    collection: 'field-showcases',
    data: {
      title: 'Data Table import regression',
      codeExample: 'const answer = 42;\n',
      linkExample: { type: 'external', label: 'Payload', external: 'https://payloadcms.com', newTab: false },
      colorExample: { hex: '#336699', alpha: 1 },
      phoneExample: { number: '+14165550123', country: 'CA' },
      tableExample,
    },
    overrideAccess: true,
  });

  console.log(`Seeded Payload field showcase ${showcase.id} for user ${user.id}.`);
  await payload.destroy();
}
