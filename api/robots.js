module.exports = function robots(request, response) {
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    return response.status(400).send("Invalid host");
  }

  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return response.status(200).send(`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: https://${host}/sitemap.xml\n`);
};