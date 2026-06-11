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
        theme_color: '#2563eb',
        background_color: '#ffffff',
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
        // FIX: Point this to your real build directory so the glob pattern doesn't scan an empty folder
        globDirectory: '../public', 
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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
    strictPort: true,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:5000',
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
