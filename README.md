# CJ Prom 07

Web del equipo de fútbol de exalumnos del Colegio Javier. Las páginas consumen los archivos de `content/`; el panel editorial es Decap CMS en `/admin/`.

## Datos deportivos

- `content/partidos.json` es la fuente del calendario y los resultados. Cada partido finalizado debe incluir los dos marcadores; las fechas se guardan en formato ISO con la hora de Panamá.
- `content/partidos.json` usa **Cancha del Colegio Javier** como sede predeterminada.
- `content/plantel.json` contiene el plantel y las fotografías opcionales. Si falta una imagen, se muestran las iniciales del jugador.
- `content/site.json` contiene la identidad del club y el logo opcional.
- La tabla de posiciones no se calcula ni se publica.
- Los goles mostrados en el plantel y en la tabla de goleadores se calculan sumando el campo `goleadores` de cada partido finalizado. Registrar ahí únicamente a los jugadores de CJ Prom 07. Se acepta el nombre completo o un apellido único del plantel.

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

La aplicación se puede instalar como **CJ07 App** desde el botón del pie de página. Android ofrece el diálogo de instalación cuando el navegador lo habilita; en iPhone/iPad se muestran los pasos para Safari: **Compartir → Añadir a pantalla de inicio**. Tras la instalación, el evento `appinstalled` guarda el estado local para ocultar el botón; en el modo `standalone` también se oculta sin depender de ese estado. El manifiesto usa el logo SVG existente en `assets/img/cj-prom-07-logo.svg` (viewBox cuadrado de 512 × 512); no hace falta subir otro archivo. El modo `standalone` abre la PWA sin la barra de direcciones del navegador. Los gestos del sistema operativo, como deslizar para ir a Inicio, no se pueden desactivar desde una web.

Cada partido programado incluye **Guardar en mi calendario**, que descarga un archivo `.ics` compatible con Calendario de Apple y las apps de calendario de Android.

El service worker puede recibir y mostrar un evento push, pero todavía no existe un emisor, una clave VAPID ni almacenamiento persistente de suscripciones. Por tanto, las notificaciones push de próximos partidos no están activas; para habilitarlas hay que elegir/configurar el proveedor de envío y aportar sus credenciales. Tampoco se configuraron Google Analytics ni Search Console porque faltan el dominio definitivo, el identificador de medición y la verificación de propiedad.

## Foto principal del equipo

En **Administración → Configuración del club → Identidad**, carga la imagen en el campo **Foto del hero**. Se recomienda una foto horizontal de 1920 × 1280 px; el sitio la recorta de forma responsiva para cubrir el fondo del hero, sin estirarla. Publica los cambios del CMS para actualizar el sitio. Si se deja el campo vacío, se conserva el fondo gráfico actual.