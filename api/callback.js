const crypto = require("node:crypto");

const siteURL = "https://cj-prom07fc.vercel.app";
const callbackURL = `${siteURL}/api/callback`;

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

const popupResponse = (response, error, token) => {
  const event = error
    ? `authorization:github:error:${JSON.stringify({ message: error })}`
    : `authorization:github:success:${JSON.stringify({ token, provider: "github" })}`;
  const safeEvent = JSON.stringify(event).replace(/</g, "\\u003c");

  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"
  );
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader(
    "Set-Cookie",
    "cj_oauth_state=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
  );
  return response
    .status(200)
    .send(`<!doctype html><meta charset="utf-8"><title>GitHub OAuth</title><script>if(window.opener){window.opener.postMessage(${safeEvent},${JSON.stringify(siteURL)});}window.close();</script><p>Autenticación completada. Puedes cerrar esta ventana.</p>`);
};

module.exports = async function callback(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).send("Method not allowed");
  }

  const { code, state, error } = request.query || {};
  const savedState = readCookie(request, "cj_oauth_state");
  if (error) return popupResponse(response, "Autorización cancelada en GitHub.");
  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !savedState ||
    !equalState(state, savedState)
  ) {
    return popupResponse(
      response,
      "No se pudo validar la solicitud OAuth. Intenta iniciar sesión de nuevo."
    );
  }

  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientID || !clientSecret) {
    return popupResponse(response, "OAuth no está configurado en el servidor.");
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientID,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackURL
      })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      return popupResponse(response, "GitHub no pudo completar la autenticación.");
    }
    return popupResponse(response, null, tokenData.access_token);
  } catch {
    return popupResponse(response, "No fue posible conectar con GitHub. Intenta de nuevo.");
  }
};
