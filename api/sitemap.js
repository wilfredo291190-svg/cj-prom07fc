const pages = ["/", "/calendario.html", "/plantel.html", "/estadisticas.html"];

module.exports = function sitemap(request, response) {
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    return response.status(400).send("Invalid host");
  }

  const urls = pages.map((page) => `  <url><loc>https://${host}${page}</loc></url>`).join("\n");
  response.setHeader("Content-Type", "application/xml; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return response.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
};