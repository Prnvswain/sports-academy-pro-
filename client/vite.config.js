import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'SAMS — Sports Academy Management',
        short_name: 'SAMS',
        description:
          'Multi-tenant sports academy operations, coaching, attendance, and analytics platform.',
        theme_color: '#059669', // UPDATED: Reconfigured to match your Emerald/Mint Green sports token
        background_color: '#f8fafc', // UPDATED: Linked to your light-mode background color variable
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globDirectory: '../public',
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2,woff,ttf,eot}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^\/api\/v1\/.*/i,
            handler: 'NetworkOnly',
            method: 'GET'
          },
          {
            urlPattern: /^\/api\/v1\/.*/i,
            handler: 'NetworkOnly',
            method: 'POST'
          },
          {
            urlPattern: /^\/api\/v1\/.*/i,
            handler: 'NetworkOnly',
            method: 'PUT'
          },
          {
            urlPattern: /^\/api\/v1\/.*/i,
            handler: 'NetworkOnly',
            method: 'PATCH'
          },
          {
            urlPattern: /^\/api\/v1\/.*/i,
            handler: 'NetworkOnly',
            method: 'DELETE'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: false, // FIXED: Allows Vite to dynamically grab port 5174 or 5175 if port 5173 stays locked by a dead window node
    proxy: {
      '/api/v1': {
        target: 'http://localhost:5000', // Forwards frontend dashboard API communication lines natively to Express
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: '../public',
    emptyOutDir: true
  }
});