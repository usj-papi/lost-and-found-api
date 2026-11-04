import { Router } from "express";
import type { LostObjectController } from "../contexts/lost-objects/application/lost-object.controller.js";
import {
  adminAuthMiddleware,
  visitorOrAdminAuthMiddleware,
} from "../middlewares/auth.middleware.js";

export function lostObjectRoutes(lostObjectController: LostObjectController) {
  const router = Router();

  router.get("/", visitorOrAdminAuthMiddleware, (req, res) =>
    lostObjectController.getAllLostObjects(req, res),
  );

  router.get("/:id", visitorOrAdminAuthMiddleware, (req, res) =>
    lostObjectController.getLostObjectById(req, res),
  );

  router.post("/", adminAuthMiddleware, (req, res) =>
    lostObjectController.createLostObject(req, res),
  );

  router.put("/:id", adminAuthMiddleware, (req, res) =>
    lostObjectController.updateLostObject(req, res),
  );

  router.delete("/:id", adminAuthMiddleware, (req, res) =>
    lostObjectController.deleteLostObject(req, res),
  );

  return router;
}
