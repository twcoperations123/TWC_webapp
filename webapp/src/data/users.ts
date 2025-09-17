export type User = { id: string; name: string; role: "user" | "restaurant" };
export const demoUsers: User[] = [
  { id: "user",  name: "Regular User",     role: "user" },
  { id: "admin", name: "Admin Account",    role: "restaurant" },
  { id: "bar42", name: "The Tipsy Bar 42", role: "restaurant" },
];