import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps the build working on GitHub Pages sub-paths as well as root domains.
export default defineConfig({ base: './', plugins: [react()] });
