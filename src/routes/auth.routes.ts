import { Router } from "express";
import type { UsersController } from "../contexts/users/application/users.controller.js";

export function authRoutes(usersController: UsersController) {
  const router = Router();

  router.post("/login", (req, res) => usersController.login(req, res));

  router.post("/signup", (req, res) => usersController.signup(req, res));

  return router;
}
