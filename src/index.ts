import express from "express";
import { LostObjectController } from "./contexts/lost-objects/application/lost-object.controller.js";
import { LostObjectService } from "./contexts/lost-objects/application/lost-object.service.js";
import { LostObjectPostgresRepository } from "./contexts/lost-objects/infrastructure/lost-object.postgres.repository.js";
import { UsersController } from "./contexts/users/application/users.controller.js";
import { UsersService } from "./contexts/users/application/users.service.js";
import { UsersPostgresRepository } from "./contexts/users/infrastructure/users.postgres.repository.js";
import { createApp } from "./create-app.js";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer from 1 to 65535");
}

const lostObjectRepository = new LostObjectPostgresRepository();
const lostObjectService = new LostObjectService(lostObjectRepository);
const lostObjectController = new LostObjectController(lostObjectService);

const usersRepository = new UsersPostgresRepository();
const usersService = new UsersService(usersRepository);
const usersController = new UsersController(usersService);

// Vercel only detects an Express entrypoint that imports express directly,
// so the root app is created here and the configured app is mounted on it.
const app = express();
app.use(createApp(lostObjectController, usersController));

// On Vercel the exported app is wrapped in a serverless function,
// so only open a port when running locally.
if (!process.env.VERCEL) {
  app.listen(port, () =>
    console.log(`API listening on http://localhost:${port}`),
  );
}

export default app;
