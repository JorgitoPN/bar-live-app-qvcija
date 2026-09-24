module.exports = {
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,css,html,ico,json}'],
  globIgnores: ['404.html'],
  // Expo currently emits one large bundle; cache it once per content hash.
  maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
  swDest: 'dist/sw.js',
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  // Routes are rendered in the client, including direct visits and refreshes.
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/api\//, /^\/\.well-known\//],
  // Do not cache API/auth responses or queue user actions for later replay.
  runtimeCaching: [{
    urlPattern: ({ request, sameOrigin }) => sameOrigin &&
      ['image', 'font'].includes(request.destination),
    handler: 'CacheFirst',
    options: {
      cacheName: 'barlive-static-assets-v1',
      cacheableResponse: { statuses: [200] },
      expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  }],
};
