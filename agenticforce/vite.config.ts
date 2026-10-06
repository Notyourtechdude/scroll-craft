import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // three + R3F (~245 kB gzip) is reached only through the lazily imported
    // scenes, so default splitting keeps it out of the first load. Manual
    // chunking was tried and pulled React into that chunk, defeating it.
    chunkSizeWarningLimit: 1000,
  },
})
