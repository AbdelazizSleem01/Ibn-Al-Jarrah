// Dummy Service Worker to suppress 404 logs on localhost:3000
// from other local PWA projects previously run on this port.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});
