export type User = {
  id: string;
  username: string;
  name: string;
  // Null only for accounts created before email was collected at sign-up.
  email: string | null;
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
 *         name:
 *           type: string
 *         email:
 *           type: [string, "null"]
 *           format: email
 *           description: Null only for accounts created before email was required
 *         role:
 *           type: string
 *           enum: [visitor, admin]
 *         created_at:
 *           type: string
 *           format: date-time
 */
export type PublicUser = Omit<User, "password">;
