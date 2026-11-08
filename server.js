// Vercel entrypoint.
//
// Vercel runs `npm run build` (TypeScript 7 `tsc`) to produce `dist/`, then
// serves this plain JavaScript file, so it never has to compile TypeScript.
// Vercel only accepts an Express entrypoint that imports express directly,
// which is why the compiled app is mounted on a root app here.
import express from "express";
import api from "./dist/index.js";

const app = express();
app.use(api);

export default app;
