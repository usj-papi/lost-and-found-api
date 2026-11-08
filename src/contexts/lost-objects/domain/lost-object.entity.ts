/**
 * @openapi
 * components:
 *   schemas:
 *     LostObjectStatus:
 *       type: string
 *       enum: [returned, stored]
 *     LostObject:
 *       type: object
 *       required: [id, name, description, location, status]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
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
 */
export type LostObject = {
  id: string;
  name: string;
  description: string;
  location: string;
  status: "returned" | "stored";
};
