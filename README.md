# CJ Prom 07

Web del equipo de fútbol de exalumnos del Colegio Javier. Las páginas consumen los archivos de `content/`; el panel editorial es Decap CMS en `/admin/`.

## Datos deportivos

- `content/partidos.json` es la fuente del calendario y los resultados. Cada partido finalizado debe incluir los dos marcadores; las fechas se guardan en formato ISO con la hora de Panamá.
- `content/plantel.json` contiene el plantel, las fotografías opcionales y sus estadísticas individuales. Si falta una imagen, se muestran las iniciales del jugador.
- `content/equipos.json` mantiene los equipos participantes para que la tabla incluya también equipos que aún no tengan resultados.
- `content/site.json` contiene la identidad del club y el logo opcional.
- La tabla se calcula con los partidos finalizados usando 3 puntos por victoria, 1 por empate y 0 por derrota. El orden de desempate es puntos, diferencia de goles, goles a favor y nombre del equipo.
- Los goleadores y los goles mostrados en el plantel se calculan sumando el campo `goleadores` de cada partido finalizado. Registrar ahí únicamente a los jugadores de CJ Prom 07; el nombre del goleador puede ser su nombre completo o un apellido único del plantel.
- `content/equipos.json` enumera todos los equipos participantes, incluso los que aún no tengan resultados. La etiqueta `PROM 07` se reconoce como el mismo equipo que `CJ Prom 07`.

## Panel editorial

El sitio desplegado incluye el panel en `https://<dominio-del-sitio>/admin/`. Para habilitar el inicio de sesión:

1. Configura una OAuth App de GitHub con `https://cj-prom07fc.vercel.app` como Homepage URL y `https://cj-prom07fc.vercel.app/api/callback` como Authorization callback URL.
2. En la configuración del proyecto de Vercel, agrega `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` con las credenciales de esa OAuth App en Production y vuelve a desplegar. No guardes el Client Secret en el repositorio.
3. La cuenta que inicia sesión necesita permiso de escritura en `wilfredo291190-svg/cj-prom07fc`.

La configuración del backend se mantiene en `admin/config.yml` y `public/admin/config.yml`. El inicio pasa por `api/auth.js` y `api/callback.js`; ambos secretos OAuth se leen exclusivamente desde variables de entorno de Vercel.

## Agregar el logo SVG

En `/admin/`, abre **Configuración del club → Identidad y equipos**, carga el archivo SVG en **Logo SVG o imagen** y publica los cambios. Decap lo guarda en `assets/img/`; el logo se refleja en la navegación del sitio. También puedes agregar el archivo en esa carpeta y guardar su ruta pública en `content/site.json`, por ejemplo `/assets/img/logo.svg`. Usa un SVG confiable, con sus dimensiones declaradas y sin scripts embebidos.

El CMS publica cambios en la rama `main`. Tras conectar el repositorio a Vercel, cada publicación actualiza el sitio con el despliegue de esa rama.

## Desarrollo y validación

Requiere Node.js 20.19 o posterior.

```sh
npm ci
npm run dev -- --listen 4173
npm run lint
```

La validación comprueba sintaxis JavaScript y estructura/valores de partidos y jugadores. CI ejecuta la misma validación.

## Despliegue, SEO y notificaciones

Vercel ejecuta `npm run build` y publica `dist/`. Vite compila las cuatro páginas HTML y conserva el panel `public/admin/`; el paso de copia añade CSS, JavaScript, contenido y recursos estáticos. Las funciones `api/robots.js` y `api/sitemap.js` generan ambos recursos con el host real recibido por Vercel, sin fijar un dominio que aún no está definido.

El service worker puede recibir y mostrar un evento push, pero todavía no existe un emisor, una clave VAPID ni almacenamiento de suscripciones. Por tanto, las notificaciones push no están activas; hace falta configurar esos servicios antes de ofrecer una suscripción funcional. Tampoco se configuraron Google Analytics ni Search Console porque faltan el dominio definitivo, el identificador de medición y la verificación de propiedad.