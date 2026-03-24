import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // the user is linking site.webmanifest manually
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server:{
    port: 3000,
    open: true,
    proxy: {
      // Proxy Nominatim requests through Vite's dev server to completely bypass CORS.
      // Browser calls /api/nominatim/reverse?... → Vite forwards it server-to-server to Nominatim.
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
      }
    }
  }
})
