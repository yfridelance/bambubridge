/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "BambuBridge",
        short_name: "BambuBridge",
        description: "Bambu Lab Filament Bridge - Connect SpoolMan with Bambu Lab printers and AMS",
        theme_color: "#1890ff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // SSE stream: must bypass the service worker entirely. NetworkFirst
            // (or any caching strategy) on a never-ending text/event-stream
            // response keeps SW fetch handlers pending forever, eats the 6
            // per-origin HTTP/1.1 connection slots after a few route switches,
            // and makes every subsequent /api/v1/* request hang.
            urlPattern: /\/api\/v1\/events(\/|$)/,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/static": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    // manualChunks was tried in PR #20 to split vendor bundles, but it caused
    // a production white screen: React's CJS module init wrote to an
    // undefined `exports` because of cross-chunk interop ordering combined
    // with PWA service-worker version skew. Leave Vite's default chunking in
    // place — the 1.6 MB bundle warning is acceptable for now.
    chunkSizeWarningLimit: 1700,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
