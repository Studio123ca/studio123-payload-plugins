import esbuild from 'esbuild';

const clientEntryPoints = {
  'dist/color-field/admin/ColorField.client': 'src/color-field/admin/ColorField.client.tsx',
  'dist/color-field/client': 'src/color-field/client.ts',
};

const externalPackages = [
  'payload',
  '@payloadcms/ui',
  'react',
  'react-dom',
];

async function build() {
  try {
    await esbuild.build({
      entryPoints: clientEntryPoints,
      outdir: '.',
      format: 'esm',
      target: 'es2020',
      platform: 'browser',
      sourcemap: true,
      bundle: true,
      external: externalPackages,
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
