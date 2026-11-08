export type User = {
  id: string;
  username: string;
  password: string;
  role: "visitor" | "admin";
  createdAt?: Date;
};

/**
 * @openapi
 * components:
 *   schemas:
 *     PublicUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         username:
 *           type: string
 *         role:
 *           type: string
 *           enum: [visitor, admin]
 *         created_at:
 *           type: string
 *           format: date-time
 */
export type PublicUser = Omit<User, "password">;
