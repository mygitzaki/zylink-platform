import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Fallback API URL for production if env var not set
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'https://zylink-platform-production.up.railway.app')
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  }
})
