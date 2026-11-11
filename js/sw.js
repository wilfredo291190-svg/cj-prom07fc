self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'CJ Prom 07', body: '¡Nuevo aviso del equipo!' };
  
  const options = {
    body: data.body,
    icon: '/assets/img/icon.png',
    badge: '/assets/img/icon.png'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
