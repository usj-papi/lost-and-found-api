export type LostObject = {
  id: string;
  name: string;
  description: string;
  location: string;
  status: "returned" | "stored";
};
