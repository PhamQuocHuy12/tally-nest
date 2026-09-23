import { rm } from 'node:fs/promises';
import { build } from 'esbuild';

await rm('dist', { recursive: true, force: true });

await build({
  bundle: true,
  entryPoints: {
    api: 'src/handlers/api/index.ts',
    'ai-request': 'src/handlers/ai-request/index.ts',
    'ai-worker': 'src/handlers/ai-worker/index.ts',
    cleanup: 'src/handlers/cleanup/index.ts',
  },
  external: ['@aws-sdk/*'],
  format: 'esm',
  outExtension: {
    '.js': '.mjs',
  },
  logLevel: 'info',
  minify: false,
  outdir: 'dist',
  platform: 'node',
  sourcemap: true,
  sourcesContent: false,
  target: 'node24',
  treeShaking: true,
});
