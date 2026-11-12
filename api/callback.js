const crypto = require("node:crypto");

const siteURL = "https://cj-prom07fc.vercel.app";
const callbackURL = `${siteURL}/api/callback`;
const tokenURL = "https://github.com/login/oauth/access_token";

const readCookie = (request, name) => {
  const cookie = request.headers.cookie || "";
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return value ? value.slice(name.length + 1) : "";
};

const equalState = (first, second) => {
  const left = Buffer.from(first);
  const right = Buffer.from(second);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const setPopupHeaders = (response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"
  );
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader(
    "Set-Cookie",
    "cj_oauth_state=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
  );
};

const errorResponse = (response, error) => {
  setPopupHeaders(response);
  return response
    .status(200)
    .send(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Error de autenticación</title><body><main><h1>No se pudo completar el inicio de sesión</h1><pre>${escapeHTML(error)}</pre><p>Puedes cerrar esta ventana después de revisar el error.</p></main></body></html>`);
};

const escapeHTML = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const successResponse = (response, token) => {
  setPopupHeaders(response);
  const safeToken = JSON.stringify(token).replace(/</g, "\\u003c");
  const safeOrigin = JSON.stringify(siteURL);
  return response.status(200).send(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Autenticación completada</title><body><p id="status">Conectando con Decap CMS…</p><script>
    const token = ${safeToken};
    const origin = ${safeOrigin};
    window.addEventListener("message", (event) => {
      if (event.origin !== origin || event.source !== window.opener || event.data !== "authorizing:github") return;
      window.opener.postMessage(
        "authorization:github:success:" + JSON.stringify({ token, provider: "github" }),
        origin
      );
      window.close();
    });
    if (window.opener) {
      window.opener.postMessage("authorizing:github", origin);
    } else {
      document.getElementById("status").textContent = "No se encontró la ventana del panel de administración.";
    }
  </script></body></html>`);
};

module.exports = async function callback(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).send("Method not allowed");
  }

  const query = request.query || {};
  const { code, state, error } = query;
  const savedState = readCookie(request, "cj_oauth_state");
  if (error) {
    return errorResponse(
      response,
      typeof query.error_description === "string"
        ? query.error_description
        : "Autorización cancelada en GitHub."
    );
  }
  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !savedState ||
    !equalState(state, savedState)
  ) {
    return errorResponse(
      response,
      "No se pudo validar la solicitud OAuth. Intenta iniciar sesión de nuevo."
    );
  }

  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientID || !clientSecret) {
    return errorResponse(response, "OAuth no está configurado en el servidor.");
  }

  try {
    const tokenResponse = await fetch(tokenURL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientID,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackURL
      })
    });
    const data = await tokenResponse.json();
    if (!tokenResponse.ok || !data.access_token) {
      return errorResponse(response, data.error_description || JSON.stringify(data));
    }
    return successResponse(response, data.access_token);
  } catch (error) {
    return errorResponse(
      response,
      error instanceof Error ? error.message : "No fue posible conectar con GitHub."
    );
  }
};
