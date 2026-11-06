import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Emits sw.js with the list of built files so the app works offline after the first load.
function offlineCache() {
  return {
    name: 'wd-offline-cache',
    apply: 'build',
    generateBundle(_, bundle) {
      // The HEIC converter is large and rarely needed: it is fetched (and then kept) only when a HEIC photo is used.
      const files = ['./', ...Object.keys(bundle).filter((f) => !/heic/i.test(f) && !/heic/i.test(bundle[f].name || '')).map((f) => './' + f), './manifest.webmanifest', './icon.svg'];
      const version = createHash('sha1').update(files.join() + Object.values(bundle).map((b) => b.code || b.source || '').join('')).digest('hex').slice(0, 10);
      const src = readFileSync(new URL('./sw.template.js', import.meta.url), 'utf8')
        .replace('__VERSION__', version)
        .replace('__FILES__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src });
    },
  };
}

// Relative base: works on any static host and any sub-path (e.g. GitHub Pages /phonics/).
export default defineConfig({ base: './', plugins: [offlineCache()] });
