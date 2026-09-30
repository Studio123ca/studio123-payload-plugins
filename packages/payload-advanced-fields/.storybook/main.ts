import type { StorybookConfig } from '@storybook/react-vite';
import { initI18n } from '@payloadcms/translations';
import { en } from '@payloadcms/translations/languages/en';
import { buildConfig, createClientConfig, type Config } from 'payload';

const config: StorybookConfig = {
  stories: ['../storybook/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
  staticDirs: ['./public'],
  core: { disableTelemetry: true },
  async viteFinal(viteConfig) {
    // Generate genuine client config on the Node side; never bundle Payload's server into stories.
    const payloadConfig = await buildConfig({
      secret: 'storybook-local-fixtures-only',
      // Only ID metadata is used to generate client config; no database is initialized.
      db: { defaultIDType: 'text' },
      admin: { user: 'users', autoRefresh: false },
      routes: { api: '/storybook-api', admin: '/admin' },
      localization: { locales: ['en', 'fr'], defaultLocale: 'en', fallback: true },
      collections: [
        { slug: 'users', auth: true, fields: [] },
        { slug: 'stories', fields: [] },
        { slug: 'pages', admin: { useAsTitle: 'title' }, fields: [{ name: 'title', type: 'text' }] },
      ],
    } as Config);
    const i18n = await initI18n({ config: { supportedLanguages: { en } }, context: 'client', language: 'en' });
    const clientConfig = createClientConfig({ config: payloadConfig, i18n, importMap: {}, user: true });
    const virtualID = 'virtual:payload-story-config';
    viteConfig.plugins = [
      ...(viteConfig.plugins ?? []),
      {
        name: 'payload-story-config',
        resolveId(id) {
          if (id === virtualID) return `\0${virtualID}`;
        },
        load(id) {
          if (id === `\0${virtualID}`) return `export default ${JSON.stringify(clientConfig)}`;
        },
      },
    ];
    viteConfig.define = {
      ...viteConfig.define,
      'process.env.NEXT_PUBLIC_ENABLE_ROUTER_CACHE_REFRESH': JSON.stringify('false'),
    };
    // Storybook is entirely client-side, so server/client directives have no effect.
    viteConfig.build = {
      ...viteConfig.build,
      rolldownOptions: {
        onwarn(warning, warn) {
          if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning);
        },
      },
    };
    viteConfig.resolve = { ...viteConfig.resolve, dedupe: ['react', 'react-dom'] };
    return viteConfig;
  },
};
export default config;
