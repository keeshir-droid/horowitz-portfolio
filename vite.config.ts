import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev backend (npm run api:dev). No changeOrigin: the API's same-origin check compares Origin with Host.
const apiProxy = { '/api': 'http://127.0.0.1:8787' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
