const crypto = require("node:crypto");

const callbackURL = "https://cj-prom07fc.vercel.app/api/callback";

module.exports = function auth(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).send("Method not allowed");
  }

  const clientID = process.env.GITHUB_CLIENT_ID;
  if (!clientID) return response.status(500).send("OAuth is not configured");

  const state = crypto.randomBytes(32).toString("hex");
  const authorizationURL = new URL("https://github.com/login/oauth/authorize");
  authorizationURL.searchParams.set("client_id", clientID);
  authorizationURL.searchParams.set("redirect_uri", callbackURL);
  authorizationURL.searchParams.set("scope", "repo");
  authorizationURL.searchParams.set("state", state);

  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader(
    "Set-Cookie",
    `cj_oauth_state=${state}; Path=/api; Max-Age=600; HttpOnly; Secure; SameSite=Lax`
  );
  response.setHeader("Location", authorizationURL.toString());
  return response.status(302).end();
};
