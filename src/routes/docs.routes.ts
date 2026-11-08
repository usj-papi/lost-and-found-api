import { Router } from "express";
// Generated from the `@openapi` comments by scripts/generate-openapi.ts.
import openApiDocument from "../docs/openapi.json" with { type: "json" };

// Swagger UI assets are loaded from a CDN so nothing has to be served from
// node_modules, which Vercel's serverless bundle does not include.
const SWAGGER_UI_VERSION = "5.17.14";
const CDN = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

const swaggerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lost and Found API · Docs</title>
    <link rel="stylesheet" href="${CDN}/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${CDN}/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "openapi.json",
        dom_id: "#swagger-ui",
        persistAuthorization: true,
      });
    </script>
  </body>
</html>`;

export function docsRoutes() {
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });

  router.get("/", (req, res) => {
    // Relative "openapi.json" only resolves correctly with a trailing slash.
    if (!req.originalUrl.split("?")[0]?.endsWith("/")) {
      res.redirect(301, `${req.baseUrl}/`);
      return;
    }
    res.type("html").send(swaggerHtml);
  });

  return router;
}
