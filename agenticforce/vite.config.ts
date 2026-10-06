import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // three + R3F is the heaviest dependency by far. It is only reached
        // through the lazily imported scenes, so it never blocks first paint,
        // and its own chunk stays cached across deploys of the page code.
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'three'
          if (id.includes('node_modules/gsap')) return 'gsap'
        },
      },
    },
  },
})
