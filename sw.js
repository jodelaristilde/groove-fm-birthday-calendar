// sw.js — minimal service worker.
//
// This file MUST live at the ROOT of your site (same folder as index.html,
// NOT inside /api). It's what lets birthday notifications actually work on
// mobile Chrome/Android — those browsers block the plain `new Notification()`
// call the page used to make and require notifications to be shown through
// a registered service worker instead (ServiceWorkerRegistration.showNotification).
//
// It doesn't need to do anything fancy — just being registered is enough to
// unlock reg.showNotification() for the page.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Focus/open the app when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
