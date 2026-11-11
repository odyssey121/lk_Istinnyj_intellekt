import { PrismaClient, ReviewStatus, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { dates, day, statistics, today } from "../shared/statistics";
const db = new PrismaClient();
async function main() {
  for (const [id, name] of [
    [1, "Кофейни «Зёрна»"],
    [2, "Клиники «Баланс»"],
  ] as const)
    await db.company.upsert({
      where: { id },
      create: { id, name },
      update: { name },
    });
  const passwordHash = await hash("DemoPass123!", 10);
  for (const [id, email, role, companyId] of [
    [1, "admin@ii.demo", Role.ADMIN, null],
    [2, "client@zerna.demo", Role.CLIENT, 1],
    [3, "client@balance.demo", Role.CLIENT, 2],
  ] as const) {
    await db.user.upsert({
      where: { id },
      create: { id, email, role, companyId, passwordHash },
      update: { email, role, companyId, passwordHash },
    });
  }
  const names = [
    "Зёрна · Патриаршие",
    "Зёрна · Арбат",
    "Баланс · Тверская",
    "Баланс · Хамовники",
  ];
  const addresses = [
    "Москва, Малая Бронная, 12",
    "Москва, Арбат, 24",
    "Москва, Тверская, 18",
    "Москва, Комсомольский проспект, 32",
  ];
  const end = today(),
    start = new Date(Date.parse(end) - 89 * day).toISOString().slice(0, 10);
  for (let i = 0; i < 4; i++) {
    const id = i + 1,
      externalId = "ext-" + (i + 1);
    await db.branch.upsert({
      where: { id },
      create: {
        id,
        externalId,
        name: names[i],
        address: addresses[i],
        companyId: i < 2 ? 1 : 2,
      },
      update: {},
    });
    for (const date of dates(start, end)) {
      const values = { ...statistics(externalId, date), date: new Date(date) };
      await db.dailyMetric.upsert({
        where: { branchId_date: { branchId: id, date: values.date } },
        create: { branchId: id, ...values },
        update: values,
      });
    }
    for (let j = 0; j < 18; j++) {
      const review = {
        branchId: id,
        author: ["Александра К.", "Михаил П.", "Анна С."][j % 3],
        text: [
          "Отличное место, внимательные сотрудники. Обязательно вернусь!",
          "В целом понравилось, но пришлось немного подождать.",
          "Есть замечания к обслуживанию. Надеюсь, обратная связь поможет.",
        ][j % 3],
        rating: (j % 5) + 1,
        date: new Date(Date.parse(end) - j * 4 * day),
        status: [ReviewStatus.NEW, ReviewStatus.IN_PROGRESS, ReviewStatus.DONE][
          j % 3
        ],
      };
      await db.review.upsert({
        where: { id: i * 18 + j + 1 },
        create: { id: i * 18 + j + 1, ...review },
        update: {},
      });
    }
  }
  // Fixtures use explicit IDs; keep automatic inserts above all existing IDs.
  for (const table of ["Company", "User", "Branch", "Review"] as const) {
    await db.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), GREATEST((SELECT MAX("id") FROM "${table}"), (SELECT last_value FROM "${table}_id_seq")), true)`,
    );
  }
}
main().finally(() => db.$disconnect());
