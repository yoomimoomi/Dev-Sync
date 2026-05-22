import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Default is 500 kB; the Radix UI + Recharts + date-fns bundle pushes past
    // that. This only silences the warning — for actual perf wins we'd code-split
    // (e.g. dynamic import() of charts and the messaging hub).
    chunkSizeWarningLimit: 1500,
  },
})
