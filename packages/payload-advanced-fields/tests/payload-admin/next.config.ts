import { withPayload } from '@payloadcms/next/withPayload';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRequire = createRequire(import.meta.url);
const sharedRuntimeImports = [
  '@payloadcms/ui',
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@studio123/payload-advanced-fields'],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(
        sharedRuntimeImports.map((moduleName) => [
          `${moduleName}$`,
          appRequire.resolve(moduleName, { paths: [appDirectory] }),
        ]),
      ),
    };
    return config;
  },
};

export default withPayload(nextConfig);
