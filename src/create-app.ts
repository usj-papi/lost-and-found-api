import { type Express, json } from "express";
import type { LostObjectController } from "./contexts/lost-objects/application/lost-object.controller.js";
import type { UsersController } from "./contexts/users/application/users.controller.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { logMiddleware } from "./middlewares/log.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { lostObjectRoutes } from "./routes/lost-object.routes.js";

export function createApp(
  app: Express,
  lostObjectController: LostObjectController,
  usersController: UsersController,
) {
  app.use(json());

  app.use(logMiddleware);

  app.use("/lost-objects", lostObjectRoutes(lostObjectController));
  app.use("/auth", authRoutes(usersController));

  app.use(errorMiddleware);

  return app;
}
