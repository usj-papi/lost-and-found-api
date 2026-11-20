import { Router } from "express";
import type { UsersController } from "../contexts/users/application/users.controller.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     Credentials:
 *       type: object
 *       required: [username, password]
 *       properties:
 *         username:
 *           type: string
 *           example: user
 *         password:
 *           type: string
 *           format: password
 *           example: pass
 *     SignupRequest:
 *       type: object
 *       required: [username, password, name, email]
 *       properties:
 *         username:
 *           type: string
 *           example: alice
 *         password:
 *           type: string
 *           format: password
 *           example: secret
 *         name:
 *           type: string
 *           example: Alice Smith
 *         email:
 *           type: string
 *           format: email
 *           description: Stored trimmed and lowercased; must be unique
 *           example: alice@example.com
 *     Token:
 *       type: object
 *       required: [token, refreshToken]
 *       properties:
 *         token:
 *           type: string
 *           description: JWT valid for 15 minutes
 *         refreshToken:
 *           type: string
 *           description: Opaque token valid for 7 days. Single use, each refresh returns a new one
 *     RefreshRequest:
 *       type: object
 *       required: [refreshToken]
 *       properties:
 *         refreshToken:
 *           type: string
 */
export function authRoutes(usersController: UsersController) {
  const router = Router();

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Log in and get a JWT
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Credentials'
   *     responses:
   *       200:
   *         description: Authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Token'
   *       400:
   *         description: Username or password missing
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Invalid username or password
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post("/login", (req, res) => usersController.login(req, res));

  /**
   * @openapi
   * /auth/signup:
   *   post:
   *     tags: [Auth]
   *     summary: Create a visitor account
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SignupRequest'
   *     responses:
   *       201:
   *         description: User created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PublicUser'
   *       400:
   *         description: A field is missing or empty, or the email is invalid
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
  router.post("/signup", (req, res) => usersController.signup(req, res));

  /**
   * @openapi
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Exchange a refresh token for a new JWT and refresh token
   *     description: Works even if the JWT has expired, so no Authorization header is needed. The refresh token is single use and is rotated on every call. The new JWT is built from the database, so it reflects the user's current username and role.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RefreshRequest'
   *     responses:
   *       200:
   *         description: New JWT and refresh token issued
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Token'
   *       400:
   *         description: Refresh token missing
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Refresh token unknown, expired or already used
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post("/refresh", (req, res) => usersController.refresh(req, res));

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Revoke a refresh token
   *     description: Ends the session of the given refresh token. Always returns 204, whether or not the token was valid. Already issued JWTs stay valid until they expire.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RefreshRequest'
   *     responses:
   *       204:
   *         description: Session ended
   *       400:
   *         description: Refresh token missing
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post("/logout", (req, res) => usersController.logout(req, res));

  return router;
}
