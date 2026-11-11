export const day = 86_400_000;
export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(
    new Date(),
  );
}
export function dates(from: string, to: string) {
  const a = Date.parse(from),
    b = Date.parse(to);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    new Date(a).toISOString().slice(0, 10) !== from ||
    new Date(b).toISOString().slice(0, 10) !== to ||
    b < a ||
    b - a > 89 * day
  )
    throw new Error("Период должен составлять от 1 до 90 дней");
  return Array.from({ length: (b - a) / day + 1 }, (_, i) =>
    new Date(a + i * day).toISOString().slice(0, 10),
  );
}
export function statistics(externalId: string, date: string) {
  let hash = 0;
  for (const c of externalId + date) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const views = 180 + (hash % 520);
  return {
    date,
    views,
    clicks: Math.floor(views * 0.18),
    calls: Math.floor(views * 0.08),
    routes: Math.floor(views * 0.12),
  };
}
