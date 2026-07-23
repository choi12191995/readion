import { defineConfig, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import { readFileSync } from 'fs';

/**
 * Vite plugin to make kuromoji's `require("path")` work in the browser.
 *
 * Problem: Vite pre-bundles CJS deps with esbuild, which externalizes Node built-ins.
 * The externalized "path" module becomes an empty proxy that throws on access.
 *
 * Solution: Use configureServer to intercept the browser-external path module request
 * and serve our real path shim instead. For production builds, resolve.alias handles it.
 */
function pathShimPlugin(): Plugin {
  const shimPath = resolve(__dirname, 'src/core/path-shim.ts');
  return {
    name: 'kuromoji-path-shim',
    enforce: 'pre',

    // Production build: resolve "path" to our shim
    resolveId(source) {
      if (source === 'path' || source === 'node:path') {
        return shimPath;
      }
      return null;
    },

    // Dev mode: serve kuromoji dict .gz files as raw binary (not Content-Encoding: gzip)
    // Without this, the browser auto-decompresses the file and kuromoji's zlibjs fails
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/dict/kuromoji/') && url.endsWith('.gz')) {
          const filePath = resolve(__dirname, 'public', url.slice(1));
          try {
            const data = readFileSync(filePath);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Length', data.length.toString());
            res.end(data);
          } catch {
            next();
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    pathShimPlugin(),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Readion — Rapid & Easy',
        short_name: 'Readion',
        description: 'Syntax-highlight human language by part of speech',
        theme_color: '#1565C0',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/dict\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'readion-dictionaries',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Custom path shim for kuromoji (works in workers + main thread)
      path: resolve(__dirname, 'src/core/path-shim.ts'),
    },
  },
  worker: {
    format: 'es',
    plugins: () => [pathShimPlugin()],
  },
  optimizeDeps: {
    esbuildOptions: {
      // esbuild alias takes priority over Vite's built-in Node externalization
      alias: {
        path: resolve(__dirname, 'src/core/path-shim.ts'),
      },
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('wink-nlp') || id.includes('wink-eng-lite')) {
            return 'engine-wink';
          }
        },
      },
    },
  },
});
