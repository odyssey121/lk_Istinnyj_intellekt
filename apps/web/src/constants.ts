export const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
}).format(new Date());
export const initialFrom = new Date(Date.parse(today) - 29 * 86400000)
  .toISOString()
  .slice(0, 10);
export const number = new Intl.NumberFormat("ru-RU");

export const pageTitles: Record<string, string> = {
  dashboard: "Обзор аналитики",
  branches: "Ваши филиалы",
  reviews: "Отзывы клиентов",
  imports: "Импорт статистики",
};

export const sectionPaths = {
  dashboard: "/analytics",
  branches: "/branches",
  reviews: "/reviews",
  imports: "/imports",
} as const;
