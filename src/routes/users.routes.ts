import { Router } from "express";
import type { UsersController } from "../contexts/users/application/users.controller.js";
import { adminAuthMiddleware } from "../middlewares/auth.middleware.js";

/**
 * @openapi
 * components:
 *   parameters:
 *     UserId:
 *       name: id
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *   schemas:
 *     CreateUser:
 *       type: object
 *       required: [username, password, name, email]
 *       properties:
 *         username:
 *           type: string
 *           example: bob
 *         password:
 *           type: string
 *           format: password
 *           example: secret
 *         name:
 *           type: string
 *           example: Bob Jones
 *         email:
 *           type: string
 *           format: email
 *           description: Stored trimmed and lowercased; must be unique
 *           example: bob@example.com
 *         role:
 *           type: string
 *           enum: [visitor, admin]
 *           default: visitor
 *     UpdateUser:
 *       type: object
 *       minProperties: 1
 *       description: Send only the fields to change. Unknown fields are ignored.
 *       properties:
 *         username:
 *           type: string
 *         password:
 *           type: string
 *           format: password
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [visitor, admin]
 *           description: An admin cannot change their own role
 */
export function usersRoutes(usersController: UsersController) {
  const router = Router();

  /**
   * @openapi
   * /users:
   *   get:
   *     tags: [Users]
   *     summary: List all users
   *     description: Requires an admin token. Password hashes are never returned.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/PublicUser'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   */
  router.get("/", adminAuthMiddleware, (req, res) =>
    usersController.getAllUsers(req, res),
  );

  /**
   * @openapi
   * /users/{id}:
   *   get:
   *     tags: [Users]
   *     summary: Get a user by id
   *     description: Requires an admin token.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/UserId'
   *     responses:
   *       200:
   *         description: The user
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PublicUser'
   *       400:
   *         description: The id is not a valid UUID
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get("/:id", adminAuthMiddleware, (req, res) =>
    usersController.getUserById(req, res),
  );

  /**
   * @openapi
   * /users:
   *   post:
   *     tags: [Users]
   *     summary: Create a user with any role
   *     description: Requires an admin token.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateUser'
   *     responses:
   *       201:
   *         description: User created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PublicUser'
   *       400:
   *         description: A field is missing or empty, or the email or role is invalid
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       409:
   *         description: Username or email already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post("/", adminAuthMiddleware, (req, res) =>
    usersController.createUser(req, res),
  );

  /**
   * @openapi
   * /users/{id}:
   *   patch:
   *     tags: [Users]
   *     summary: Update some fields of a user
   *     description: Requires an admin token. A new password is hashed before saving. Changing a username or role makes that user's current tokens fail /auth/refresh.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/UserId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateUser'
   *     responses:
   *       200:
   *         description: User updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PublicUser'
   *       400:
   *         description: Invalid id, no fields, an empty or invalid field, or an attempt to change your own role
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: Username or email already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.patch("/:id", adminAuthMiddleware, (req, res) =>
    usersController.updateUser(req, res),
  );

  return router;
}
