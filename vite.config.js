import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// On GitLab Pages the game is served at /damoigmai/; locally at /.
const base = process.env.CI_PROJECT_NAME ? `/${process.env.CI_PROJECT_NAME}/` : '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Damoigmai',
        short_name: 'Damoigmai',
        description: 'Space shooter 2D side-scrolling pixel art',
        theme_color: '#000814',
        background_color: '#000000',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '.',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache CDN sprite/background assets for offline play after first load.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/rpigab\.github\.io\/pixelagen\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pixelagen-cdn',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
