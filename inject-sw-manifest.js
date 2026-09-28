import { injectManifest } from 'workbox-build';
import path from 'path';

const swSrc = path.resolve('public/sw.js');
const swDest = path.resolve('dist/sw.js');

console.log('[PWA Build] Injecting manifest into service worker...');

injectManifest({
  swSrc,
  swDest,
  globDirectory: 'dist',
  globPatterns: [
    '**/*.{js,css,html,png,svg,ico,json,txt}'
  ],
  globIgnores: [
    'firebase-messaging-sw.js',
    'sw.js',
    'assets/firebase-messaging-sw-*.js'
  ]
}).then(({ count, size }) => {
  console.log(`[PWA Build] Pre-cached ${count} assets, totaling ${(size / 1024).toFixed(2)} KB.`);
}).catch((err) => {
  console.error('[PWA Build] Failed to inject manifest:', err);
  process.exit(1);
});
