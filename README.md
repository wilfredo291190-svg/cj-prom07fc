# CJ Prom 07

Web del equipo de fútbol de exalumnos del Colegio Javier. Las páginas consumen los archivos de `content/`; el panel editorial es Decap CMS en `/admin/`.

## Datos deportivos

- `content/partidos.json` es la fuente del calendario y los resultados. Cada partido finalizado debe incluir los dos marcadores.
- `content/plantel.json` contiene el plantel y las fotografías opcionales. Si falta una imagen, se muestran las iniciales del jugador.
- La tabla se calcula con los partidos finalizados usando 3 puntos por victoria, 1 por empate y 0 por derrota. El orden de desempate es puntos, diferencia de goles, goles a favor y nombre del equipo.
- Los goleadores se calculan sumando el campo `goleadores` de cada partido finalizado. Registrar ahí únicamente a los jugadores de CJ Prom 07.

Los datos actuales están vacíos intencionalmente: no se cargaron los ejemplos anteriores porque no son resultados confirmados.

## Panel editorial

El sitio desplegado incluye el panel en `https://<dominio-del-sitio>/admin/`. Para habilitar el inicio de sesión:

1. Crea una OAuth App en GitHub con la URL del sitio como Homepage URL y `https://<dominio-del-sitio>/admin/` como Authorization callback URL.
2. Sustituye `CONFIGURAR_CLIENT_ID_OAUTH` en `admin/config.yml` por el Client ID de esa aplicación. El Client ID es público; no guardes un Client Secret en el repositorio.
3. La cuenta que inicia sesión necesita permiso de escritura en `wilfredo291190-svg/cj-prom07fc`.

El CMS publica cambios en la rama `main`. Tras conectar el repositorio a Vercel, cada publicación actualiza el sitio con el despliegue de esa rama.

## Desarrollo y validación

Requiere Node.js 20 o posterior.

```sh
npm ci
npm run dev -- --listen 4173
npm run lint
```

La validación comprueba sintaxis JavaScript y estructura/valores de partidos y jugadores. CI ejecuta la misma validación.

## Despliegue, SEO y notificaciones

Conecta este repositorio a Vercel usando la configuración predeterminada para un sitio estático. `api/robots.js` y `api/sitemap.js` generan ambos recursos con el host real recibido por Vercel, sin fijar un dominio que aún no está definido.

El service worker puede recibir y mostrar un evento push, pero todavía no existe un emisor, una clave VAPID ni almacenamiento de suscripciones. Por tanto, las notificaciones push no están activas; hace falta configurar esos servicios antes de ofrecer una suscripción funcional. Tampoco se configuraron Google Analytics ni Search Console porque faltan el dominio definitivo, el identificador de medición y la verificación de propiedad.