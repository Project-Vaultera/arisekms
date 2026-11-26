import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // No `envDir`: settings come from the container environment, which compose
  // fills from the repo-root .env. A second arisekms-fe/.env would silently
  // win in only some of the ways this app is run.
  server: { port: 5173, host: true },
})
