import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'build',
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
