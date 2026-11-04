export type User = {
  id: string;
  username: string;
  password: string;
  role: "visitor" | "admin";
  createdAt?: Date;
};

export type PublicUser = Omit<User, "password">;
