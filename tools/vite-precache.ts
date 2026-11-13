/// <reference types="node" />
/**
 * A small Vite plugin that builds the service worker (src/pwa/sw.ts) as a
 * standalone `sw.js` next to index.html and writes the precache manifest into
 * it: every built file plus the files from `public/`, and a hash of all their
 * contents. Any change to the build changes sw.js, which is how browsers
 * notice a new version.
 *
 * Written instead of using a PWA plugin to keep the dependency list short and
 * the whole mechanism readable (docs/STUDY.md, "PWA").
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

export interface PrecacheOptions {
  /** Absolute path of the worker's entry module. */
  readonly entry: string;
  /** Files (relative to the output root) that should not be kept offline. */
  readonly exclude?: (file: string) => boolean;
}

const SW_FILE = 'sw.js';
const MARKER = '__PRECACHE_MANIFEST__';

function listFiles(dir: string): string[] {
  let out: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listFiles(full));
    else out.push(full);
  }
  return out;
}

export function precacheServiceWorker(options: PrecacheOptions): Plugin {
  let publicDir = '';
  return {
    name: 'neon-rift:precache',
    apply: 'build',
    // After Vite's own plugins, so index.html is already in the bundle.
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    buildStart() {
      this.emitFile({ type: 'chunk', id: options.entry, fileName: SW_FILE });
    },
    generateBundle(_output, bundle) {
      const sw = bundle[SW_FILE];
      if (sw?.type !== 'chunk') return this.error(`${SW_FILE} was not built`);
      if (sw.imports.length > 0) {
        return this.error(
          `${SW_FILE} must be self-contained, but imports ${sw.imports.join(', ')}: ` +
            'do not import its modules from the page',
        );
      }
      const contents = new Map<string, string | Uint8Array>();
      for (const [name, item] of Object.entries(bundle)) {
        if (name === SW_FILE || name.endsWith('.map')) continue;
        contents.set(name, item.type === 'chunk' ? item.code : item.source);
      }
      for (const full of listFiles(publicDir)) {
        contents.set(relative(publicDir, full).split(sep).join('/'), readFileSync(full));
      }
      const files = [...contents.keys()].filter((f) => !options.exclude?.(f)).sort();
      const hash = createHash('sha256');
      for (const f of files)
        hash
          .update(f)
          .update('\0')
          .update(contents.get(f) ?? '');
      const manifest = { version: hash.digest('hex').slice(0, 12), files };

      const parts = sw.code.split(MARKER);
      if (parts.length !== 2) return this.error(`${SW_FILE}: expected one ${MARKER} placeholder`);
      sw.code = parts.join(JSON.stringify(manifest));
    },
  };
}
