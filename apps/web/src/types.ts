export type User = { email: string; role: "ADMIN" | "CLIENT" };
export type Branch = {
  id: number;
  name: string;
  address: string;
  company: { name: string };
};
export type Review = {
  id: number;
  author: string;
  text: string;
  rating: number;
  date: string;
  status: string;
  branch: { name: string };
};
export const statuses: Record<string, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  DONE: "Обработан",
};
