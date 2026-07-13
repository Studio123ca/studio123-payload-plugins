import esbuild from 'esbuild';

const browserEntryPoints = {
  'dist/color-field/admin/ColorField.client': 'src/color-field/admin/ColorField.client.tsx',
  'dist/color-field/client': 'src/color-field/client.ts',
  'dist/phone-field/client': 'src/phone-field/client.ts',
};

const nodeEntryPoints = {
  'dist/phone-field/server/field': 'src/phone-field/server/field.ts',
};

const browserExternalPackages = [
  'payload',
  '@payloadcms/ui',
  'react',
  'react-dom',
];

const nodeExternalPackages = [
  'payload',
];

async function build() {
  try {
    await esbuild.build({
      entryPoints: browserEntryPoints,
      outdir: '.',
      format: 'esm',
      target: 'es2020',
      platform: 'browser',
      sourcemap: true,
      bundle: true,
      external: browserExternalPackages,
      splitting: false,
      minify: false,
      outExtension: {
        '.js': '.js',
      },
    });

    await esbuild.build({
      entryPoints: nodeEntryPoints,
      outdir: '.',
      format: 'esm',
      target: 'es2020',
      platform: 'node',
      sourcemap: true,
      bundle: true,
      external: nodeExternalPackages,
      splitting: false,
      minify: false,
      outExtension: {
        '.js': '.js',
      },
    });

    console.log('✓ ESBuild client bundling completed successfully');
  } catch (error) {
    console.error('✗ ESBuild bundling failed:', error);
    process.exit(1);
  }
}

build();
