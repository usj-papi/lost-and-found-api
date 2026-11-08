import { Router } from "express";
import type { LostObjectController } from "../contexts/lost-objects/application/lost-object.controller.js";
import { adminAuthMiddleware } from "../middlewares/auth.middleware.js";

/**
 * @openapi
 * components:
 *   parameters:
 *     LostObjectId:
 *       name: id
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *   schemas:
 *     CreateLostObject:
 *       type: object
 *       required: [name, description, location]
 *       properties:
 *         name:
 *           type: string
 *           example: Black umbrella
 *         description:
 *           type: string
 *           example: Folding, with wooden handle
 *         location:
 *           type: string
 *           example: Library, 2nd floor
 *         status:
 *           $ref: '#/components/schemas/LostObjectStatus'
 *           default: stored
 *     UpdateLostObject:
 *       type: object
 *       required: [name, description, location, status]
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         location:
 *           type: string
 *         status:
 *           $ref: '#/components/schemas/LostObjectStatus'
 */
export function lostObjectRoutes(lostObjectController: LostObjectController) {
  const router = Router();

  /**
   * @openapi
   * /lost-objects:
   *   get:
   *     tags: [Lost objects]
   *     summary: List all lost objects
   *     responses:
   *       200:
   *         description: List of lost objects
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LostObject'
   */
  router.get("/", (req, res) =>
    lostObjectController.getAllLostObjects(req, res),
  );

  /**
   * @openapi
   * /lost-objects/{id}:
   *   get:
   *     tags: [Lost objects]
   *     summary: Get a lost object by id
   *     parameters:
   *       - $ref: '#/components/parameters/LostObjectId'
   *     responses:
   *       200:
   *         description: The lost object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LostObject'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get("/:id", (req, res) =>
    lostObjectController.getLostObjectById(req, res),
  );

  /**
   * @openapi
   * /lost-objects:
   *   post:
   *     tags: [Lost objects]
   *     summary: Register a lost object
   *     description: Requires an admin token.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateLostObject'
   *     responses:
   *       201:
   *         description: Lost object created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LostObject'
   *       400:
   *         description: Missing fields or invalid status
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   */
  router.post("/", adminAuthMiddleware, (req, res) =>
    lostObjectController.createLostObject(req, res),
  );

  /**
   * @openapi
   * /lost-objects/{id}:
   *   put:
   *     tags: [Lost objects]
   *     summary: Replace a lost object
   *     description: Requires an admin token.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/LostObjectId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateLostObject'
   *     responses:
   *       200:
   *         description: Lost object updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LostObject'
   *       400:
   *         description: Missing fields
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.put("/:id", adminAuthMiddleware, (req, res) =>
    lostObjectController.updateLostObject(req, res),
  );

  /**
   * @openapi
   * /lost-objects/{id}:
   *   delete:
   *     tags: [Lost objects]
   *     summary: Delete a lost object
   *     description: Requires an admin token.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/LostObjectId'
   *     responses:
   *       204:
   *         description: Lost object deleted
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.delete("/:id", adminAuthMiddleware, (req, res) =>
    lostObjectController.deleteLostObject(req, res),
  );

  return router;
}
