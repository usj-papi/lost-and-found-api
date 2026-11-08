// Builds the OpenAPI document from the `@openapi` JSDoc comments in src/ and
// writes it to src/docs/openapi.json, which the /docs route imports.
//
// It runs before `dev`, `check` and `build` because the comments live in the
// TypeScript sources: type-only files (such as the entities) compile to empty
// JavaScript, so their comments would be lost if we parsed dist/ instead.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import swaggerJsdoc from "swagger-jsdoc";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = fileURLToPath(
  new URL("../src/docs/openapi.json", import.meta.url),
);

const document = swaggerJsdoc({
  failOnErrors: true,
  apis: [`${root}src/**/*.ts`],
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Lost and Found API",
      version: "1.0.0",
      description:
        "REST API for registering and listing lost objects found on campus.",
    },
    tags: [
      { name: "Auth", description: "Sign up and log in" },
      { name: "Lost objects", description: "Manage lost objects" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { message: { type: "string" } },
          required: ["message"],
        },
      },
      responses: {
        Unauthorized: {
          description: "Missing, malformed or invalid token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Forbidden: {
          description: "Authenticated user is not an admin",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NotFound: {
          description: "Lost object not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
});

writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
console.log(`OpenAPI document written to ${output}`);
