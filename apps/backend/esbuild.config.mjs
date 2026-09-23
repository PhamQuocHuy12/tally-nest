import { build } from 'esbuild';

await build({
  bundle: true,
  entryPoints: {
    api: 'src/handlers/api/index.ts',
    'ai-worker': 'src/handlers/ai-worker/index.ts',
    cleanup: 'src/handlers/cleanup/index.ts',
  },
  external: ['@aws-sdk/*'],
  format: 'esm',
  logLevel: 'info',
  minify: false,
  outdir: 'dist',
  platform: 'node',
  sourcemap: true,
  sourcesContent: false,
  target: 'node24',
  treeShaking: true,
});
