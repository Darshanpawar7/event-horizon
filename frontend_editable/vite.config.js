import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const MEDIA_TYPES = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
};

/**
 * Serves the repository's `sample crowd videos/` folder at `/samples` during
 * development, so the demo clips are selectable with only the dev server
 * running. The backend's `/api/sources` library is the real route and takes
 * precedence; this is the offline fallback, dev-only, read-only.
 */
function sampleVideos(directory) {
  const listing = () =>
    fs.existsSync(directory)
      ? fs
          .readdirSync(directory)
          .filter((name) => MEDIA_TYPES[path.extname(name).toLowerCase()])
          .map((name) => ({
            source_id: `sample:${name}`,
            name,
            origin: 'bundled',
            size_bytes: fs.statSync(path.join(directory, name)).size,
            url: `/samples/${encodeURIComponent(name)}`,
          }))
      : [];

  return {
    name: 'event-horizon-sample-videos',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/samples', (request, response, next) => {
        if (request.url === '/' || request.url === '/index.json') {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ sources: listing() }));
          return;
        }

        const name = path.basename(decodeURIComponent(request.url.split('?')[0]));
        const file = path.join(directory, name);
        const extension = path.extname(name).toLowerCase();
        // Resolve and re-check the parent so a crafted name cannot escape.
        if (!MEDIA_TYPES[extension] || path.dirname(path.resolve(file)) !== path.resolve(directory)) {
          next();
          return;
        }
        if (!fs.existsSync(file)) {
          next();
          return;
        }

        // Range support so the browser can seek without buying the whole file.
        const { size } = fs.statSync(file);
        const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || '');
        const headers = { 'Content-Type': MEDIA_TYPES[extension], 'Accept-Ranges': 'bytes' };

        if (range) {
          const start = range[1] ? Number(range[1]) : 0;
          const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
          response.writeHead(206, {
            ...headers,
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Content-Length': end - start + 1,
          });
          fs.createReadStream(file, { start, end }).pipe(response);
          return;
        }

        response.writeHead(200, { ...headers, 'Content-Length': size });
        fs.createReadStream(file).pipe(response);
      });
    },
  };
}

/**
 * Keeps the two heavy libraries in chunks of their own.
 *
 * three.js and React Three Fiber only run inside the twin, and recharts only
 * inside the zone telemetry chart; both components are `lazy()` in App.jsx, so
 * these chunks are fetched after the console has painted (and the charts one
 * not until a zone is selected). Naming them also keeps their hashes stable
 * across application changes, so a returning browser serves them from cache.
 *
 * Deliberately no catch-all `vendor` chunk: that would drag libraries used
 * only by the lazy scene into the eager download. Anything unlisted is split
 * by Rollup according to who actually imports it.
 */
const CHART_PACKAGES = new Set([
  'recharts',
  'recharts-scale',
  'react-smooth',
  '@reduxjs/toolkit',
  'redux',
  'react-redux',
  'immer',
  'reselect',
  'es-toolkit',
  'eventemitter3',
  'decimal.js-light',
  'internmap',
  'delaunator',
  'robust-predicates',
  'fast-equals',
]);

function packageName(id) {
  const match = /[\\/]node_modules[\\/](?:\.pnpm[\\/])?((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(id);
  return match ? match[1].replace('\\', '/') : '';
}

/**
 * Everything the eager console needs from node_modules. Rollup hoists a
 * module shared between a manual chunk and the entry *into the manual chunk*,
 * which is how zustand once ended up inside the three.js chunk and dragged
 * the whole of it onto the critical path. Pinning the eager libraries here
 * keeps the three and charts chunks genuinely lazy.
 */
const CORE_PACKAGES = new Set([
  'react',
  'react-dom',
  'scheduler',
  'zustand',
  'framer-motion',
  'motion-dom',
  'motion-utils',
  'tslib',
  'use-sync-external-store',
]);

function vendorChunk(id) {
  // Vite's dynamic-import preload helper is a virtual module used by the
  // entry and by lazy chunks alike; it belongs with the core for the same reason.
  if (id.includes('vite/preload-helper')) return 'core';
  if (!id.includes('node_modules')) return undefined;
  const name = packageName(id);
  if (CORE_PACKAGES.has(name)) return 'core';
  // Post-processing loads after the scene has rendered, so it gets a chunk of its own.
  if (name === 'postprocessing' || name === 'n8ao' || name === '@react-three/postprocessing') return 'postfx';
  if (name === 'three' || name === 'three-stdlib' || name === 'maath' || name.startsWith('@react-three/')) {
    return 'three';
  }
  if (CHART_PACKAGES.has(name) || name.startsWith('d3-') || name.startsWith('victory-')) return 'charts';
  return undefined;
}

/**
 * Writes `.gz` and `.br` siblings for every text asset after the build, so a
 * static server can hand the browser a pre-compressed file (nginx
 * `gzip_static` / `brotli_static`, Caddy `precompressed`, Apache
 * `MultiViews`) instead of compressing the same bytes on every request. The
 * plain files stay in place for servers that do neither. Node's zlib ships
 * both codecs, so this adds no dependency.
 */
const COMPRESSIBLE = new Set(['.js', '.css', '.html', '.svg', '.json', '.txt', '.webmanifest']);
const MIN_COMPRESS_BYTES = 1024;

function precompress() {
  let outDir = 'dist';
  return {
    name: 'event-horizon-precompress',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = walk(outDir).filter(
        (file) => COMPRESSIBLE.has(path.extname(file)) && fs.statSync(file).size >= MIN_COMPRESS_BYTES,
      );
      let raw = 0;
      let gzipped = 0;
      let brotlied = 0;
      for (const file of files) {
        const source = fs.readFileSync(file);
        const gzip = zlib.gzipSync(source, { level: 9 });
        const brotli = zlib.brotliCompressSync(source, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
            [zlib.constants.BROTLI_PARAM_SIZE_HINT]: source.length,
          },
        });
        fs.writeFileSync(`${file}.gz`, gzip);
        fs.writeFileSync(`${file}.br`, brotli);
        raw += source.length;
        gzipped += gzip.length;
        brotlied += brotli.length;
      }
      const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
      console.log(
        `precompress: ${files.length} files · raw ${kb(raw)} · gzip ${kb(gzipped)} · brotli ${kb(brotlied)}`,
      );
    },
  };
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// The dev server proxies /api to the Python backend so the browser only ever
// talks to one origin. Restart after changing BACKEND_URL in .env.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const samples = env.SAMPLE_VIDEO_DIR || path.resolve(process.cwd(), '..', 'sample crowd videos');

  return {
    plugins: [react(), sampleVideos(samples), precompress()],
    build: {
      rollupOptions: { output: { manualChunks: vendorChunk } },
      // three.js alone minifies to well over the default 500 kB threshold. It
      // is the one known exception and is lazy-loaded, so the warning would
      // only be noise on every build.
      chunkSizeWarningLimit: 1024,
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.BACKEND_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
