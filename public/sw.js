self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const registrations = await self.registration.unregister()
      await caches.keys().then((cacheNames) =>
        Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))),
      )
      return registrations
    })(),
  )
})
