import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        tsconfigPaths(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'service-worker.ts',
            injectManifest: {
                // build.outDir is 'build', so this is relative to that or root?
                // Usually redundant if outDir matches, but let's be safe.
                // However, standard usage often just works.
                // explicitly setting globPatterns if needed?
                // By default it picks up css/html/js.
                swDest: 'build/service-worker.js',
            },
            manifest: false, // Use existing public/manifest.json
            injectRegister: null, // Disable auto-registration to use manual registration in src/index.tsx
        }),
    ],
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'build',
        commonjsOptions: {
            transformMixedEsModules: true,
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-ui': ['@material-ui/core', 'framer-motion', 'react-icons', 'react-select'],
                    'vendor-utils': ['@mapbox/geojson-extent', '@turf/turf', 'papaparse'],
                },
            },
        },
    },
    define: {
        global: 'window',
    },
});
