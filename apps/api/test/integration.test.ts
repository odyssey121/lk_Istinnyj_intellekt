import { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";
import { ChildProcess, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import "reflect-metadata";
import request from "supertest";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-test-secret-at-least-32-characters";
process.env.APP_ORIGIN = "http://localhost:8080";
process.env.SOURCE_URL = "http://localhost:4001";
// Защита от случайного изменения основной базы: тесты работают только с тестовой БД.
if (!process.env.DATABASE_URL?.includes("/intelligence_test"))
  throw new Error("Use a separate intelligence_test database");
const require = createRequire(import.meta.url);
const { createApp } = require("../build/apps/api/src/main.js");
const db = new PrismaClient();
let app: any, mock: ChildProcess;
const origin = process.env.APP_ORIGIN;
// before выполняется один раз перед всеми тестами: запускает источник статистики и NestJS.
before(async () => {
  mock = spawn(
    process.execPath,
    ["--import", "tsx", resolve("../../mock/server.ts")],
    { stdio: "ignore" },
  );
  // Ждём готовности HTTP-источника, чтобы импорт не зависел от скорости его запуска.
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch("http://localhost:4001/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  app = await createApp();
});
// after освобождает ресурсы после всех тестов: сервер, соединения БД и дочерний процесс.
after(async () => {
  await app?.close();
  await db.$disconnect();
  mock?.kill();
});
// Выполняет настоящий вход через API и возвращает cookie для авторизованных запросов.
// expect(201) проверяет HTTP-статус; set(Origin) передаёт разрешённый источник запроса.
async function login(email: string) {
  const res = await request(app.getHttpServer())
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email, password: "DemoPass123!" })
    .expect(201);
  return res.headers["set-cookie"];
}
// Проверяет изоляцию компаний: клиент видит только свои филиалы и показатели,
// не может обращаться к чужим данным и запускать импорт; неверные ID отклоняются.
test("client data remains isolated across lists, aggregates and direct requests", async () => {
  // Готовим известные показатели двух компаний, чтобы заметить попадание чужих данных в сумму.
  await db.dailyMetric.deleteMany({
    where: {
      date: { gte: new Date("2026-11-01"), lte: new Date("2026-11-11") },
    },
  });
  await db.dailyMetric.createMany({
    data: [
      {
        branchId: 1,
        date: new Date("2026-11-01"),
        views: 37,
        clicks: 5,
        calls: 2,
        routes: 3,
      },
      {
        branchId: 3,
        date: new Date("2026-11-01"),
        views: 70000,
        clicks: 500,
        calls: 200,
        routes: 300,
      },
    ],
  });
  // В seed клиент client@zerna.demo имеет id = 2 и относится к компании companyId = 1.
  const cookie = await login("client@zerna.demo");
  const api = request(app.getHttpServer());
  const branches = await api
    .get("/api/branches")
    .set("Cookie", cookie)
    .expect(200);
  // equal проверяет точное значение, ok — истинность условия для всех полученных филиалов.
  assert.equal(branches.body.length, 2);
  assert.ok(
    branches.body.every(
      (b: any) => Number.isInteger(b.id) && b.companyId === 1,
    ),
  );
  // Нечисловые, неположительные, дробные и слишком большие ID должны возвращать 400.
  for (const value of ["branch-1", "0", "-1", "1.5", "2147483648"]) {
    await api
      .get("/api/analytics/summary?branchId=" + value)
      .set("Cookie", cookie)
      .expect(400);
  }
  await api
    .patch("/api/reviews/not-a-number/status")
    .set("Origin", origin)
    .set("Cookie", cookie)
    .send({ status: "DONE" })
    .expect(400);
  const { body } = await api
    .get("/api/analytics/summary?dateFrom=2026-11-01&dateTo=2026-11-11")
    .set("Cookie", cookie)
    .expect(200);
  // Сверяем ответ API с выборкой из БД только по компании клиента.
  const expected = await db.dailyMetric.aggregate({
    where: {
      branch: { companyId: 1 },
      date: { gte: new Date("2026-11-01"), lte: new Date("2026-11-11") },
    },
    _sum: { views: true },
  });
  assert.equal(body.views, expected._sum.views ?? 0);
  // Из 37 своих и 70000 чужих просмотров клиент должен получить только свои 37.
  assert.equal(body.views, 37);
  // Проверяем прямые запросы к чужому филиалу, компании и отзыву в обход интерфейса.
  await api
    .get("/api/analytics/summary?branchId=3")
    .set("Cookie", cookie)
    .expect(404);
  await api
    .get("/api/analytics/timeseries?branchId=3")
    .set("Cookie", cookie)
    .expect(404);
  await api.get("/api/reviews?companyId=2").set("Cookie", cookie).expect(403);
  await api
    .patch("/api/reviews/37/status")
    .set("Origin", origin)
    .set("Cookie", cookie)
    .send({ status: "DONE" })
    .expect(404);
  // Клиенту запрещён административный импорт даже для собственного филиала.
  await api
    .post("/api/imports/statistics")
    .set("Origin", origin)
    .set("Cookie", cookie)
    .send({
      branchId: 1,
      dateFrom: "2026-11-01",
      dateTo: "2026-11-02",
    })
    .expect(403);
  // Без cookie запрос должен быть отклонён как неавторизованный.
  await api.get("/api/branches").expect(401);
});
// Проверяет повторный импорт: одинаковые запросы сохраняют те же значения
// и количество записей без дубликатов и увеличения показателей.
test("repeated import replaces values without duplicate days or inflated totals", async () => {
  const cookie = await login("admin@ii.demo");
  // В JSON тело запроса должно содержать числовой branchId, строка "1" недопустима.
  await request(app.getHttpServer())
    .post("/api/imports/statistics")
    .set("Origin", origin)
    .set("Cookie", cookie)
    .send({ branchId: "1", dateFrom: "2026-01-01", dateTo: "2026-01-03" })
    .expect(400);
  const payload = {
    branchId: 1,
    dateFrom: "2026-01-01",
    dateTo: "2026-01-03",
  };
  const where = {
    branchId: payload.branchId,
    date: { gte: new Date(payload.dateFrom), lte: new Date(payload.dateTo) },
  };
  // Очищаем выбранный период, чтобы первый импорт гарантированно создавал новые записи.
  await db.dailyMetric.deleteMany({ where });
  // Вспомогательная функция отправляет одинаковый запрос импорта и проверяет успешный статус.
  const run = () =>
    request(app.getHttpServer())
      .post("/api/imports/statistics")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .send(payload)
      .expect(201);
  // Первый импорт должен обработать все три дня; сохраняем результат для сравнения.
  assert.equal((await run()).body.processedDays, 3);
  const first = await db.dailyMetric.findMany({
    where,
    orderBy: { date: "asc" },
  });
  // Повторяем тот же импорт и читаем записи в том же порядке для точного сравнения.
  await run();
  const second = await db.dailyMetric.findMany({
    where,
    orderBy: { date: "asc" },
  });
  // deepEqual сравнивает содержимое массивов, включая ID и значения показателей.
  // Так проверяем и отсутствие дубликатов, и отсутствие повторного суммирования.
  assert.equal(second.length, 3);
  assert.deepEqual(second, first);
});
