self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'CJ Prom 07', body: 'Hay una actualización del equipo.' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (error) {
    data.body = event.data.text();
  }

  const options = {
    body: data.body,
    data: { url: data.url || '/calendario.html' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requested = new URL(event.notification.data?.url || '/calendario.html', self.location.origin);
  const destination = requested.origin === self.location.origin
    ? requested.href
    : new URL('/calendario.html', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url === destination);
    return existing ? existing.focus() : clients.openWindow(destination);
  }));
});
