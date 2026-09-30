import { http, HttpResponse } from 'msw';

export const demoUser = { id: 'storybook-user', email: 'editor@example.test', collection: 'users' };
const pages = [
  { id: 'about', title: 'About the studio' },
  { id: 'services', title: 'Our services' },
  { id: 'contact', title: 'Contact' },
];
export const permissions = {
  canAccessAdmin: true,
  collections: Object.fromEntries(
    ['users', 'stories', 'pages'].map((slug) => [
      slug,
      {
        create: true,
        read: true,
        update: true,
        delete: true,
        fields: {},
      } as const,
    ]),
  ),
  globals: {},
};

export const handlers = [
  http.get('/storybook-api/users/me', () => HttpResponse.json({ user: demoUser })),
  http.get('/storybook-api/access', () => HttpResponse.json(permissions)),
  http.all('/storybook-api/payload-preferences/:key', () => HttpResponse.json({ value: null })),
  http.all('/storybook-api/pages', async ({ request }) => {
    const params =
      request.method === 'POST' ? new URLSearchParams(await request.text()) : new URL(request.url).searchParams;
    const search = [...params.entries()].find(([key]) => /\[title\]\[(like|contains)\]$/.test(key))?.[1] ?? '';
    const docs = pages.filter((page) => page.title.toLowerCase().includes(search.toLowerCase()));
    return HttpResponse.json({
      docs,
      totalDocs: docs.length,
      limit: 10,
      totalPages: 1,
      page: 1,
      pagingCounter: 1,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: null,
      nextPage: null,
    });
  }),
  http.get('/storybook-api/pages/:id', ({ params }) =>
    HttpResponse.json(pages.find((page) => page.id === params.id) ?? pages[0]),
  ),
  // The Link field's title lookup currently uses /api directly.
  http.get('/api/pages/:id', ({ params }) =>
    HttpResponse.json(pages.find((page) => page.id === params.id) ?? pages[0]),
  ),
  http.all('/storybook-api/*', () =>
    HttpResponse.json(
      { errors: [{ message: 'This backend action is not implemented by the Storybook fixture.' }] },
      { status: 501 },
    ),
  ),
];
