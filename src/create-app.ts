import { type Express, json } from "express";
import type { LostObjectController } from "./contexts/lost-objects/application/lost-object.controller.js";
import type { UsersController } from "./contexts/users/application/users.controller.js";
import { corsMiddleware } from "./middlewares/cors.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { logMiddleware } from "./middlewares/log.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { docsRoutes } from "./routes/docs.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { lostObjectRoutes } from "./routes/lost-object.routes.js";
import { usersRoutes } from "./routes/users.routes.js";

export function createApp(
  app: Express,
  lostObjectController: LostObjectController,
  usersController: UsersController,
) {
  app.use(corsMiddleware);
  app.use(json());

  app.use(logMiddleware);

  app.use("/health", healthRoutes());
  app.use("/docs", docsRoutes());
  app.use("/lost-objects", lostObjectRoutes(lostObjectController));
  app.use("/auth", authRoutes(usersController));
  app.use("/users", usersRoutes(usersController));

  app.use(errorMiddleware);

  return app;
}
