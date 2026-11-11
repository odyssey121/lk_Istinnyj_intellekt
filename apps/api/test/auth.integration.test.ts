import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createRequire } from "node:module";
import request from "supertest";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-test-secret-at-least-32-characters";
process.env.APP_ORIGIN = "http://localhost:8080";
process.env.SOURCE_URL = "http://localhost:4001";
if (!process.env.DATABASE_URL?.includes("/intelligence_test"))
  throw new Error("Use a separate intelligence_test database");
const require = createRequire(import.meta.url);
const { createApp } = require("../build/apps/api/src/main.js");
const db = new PrismaClient();
let app: any;
const origin = process.env.APP_ORIGIN;

// Создаём отдельное приложение для проверок авторизации; внешний источник не требуется.
before(async () => {
  app = await createApp();
});
// Закрываем приложение и соединения, чтобы тестовый процесс корректно завершился.
after(async () => {
  await app?.close();
  await db.$disconnect();
});

// Сохраняем прежние настройки и восстанавливаем их даже при неудачной проверке.
async function preserveSettings(run: () => Promise<void>) {
  const previous = await db.importSettings.findUnique({
    where: { key: "statistics" },
  });
  try {
    await run();
  } finally {
    if (previous)
      await db.importSettings.upsert({
        where: { key: "statistics" },
        create: previous,
        update: { sourceUrl: previous.sourceUrl, method: previous.method },
      });
    else await db.importSettings.deleteMany({ where: { key: "statistics" } });
  }
}
async function login(email: string) {
  const response = await request(app.getHttpServer())
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email, password: "DemoPass123!" })
    .expect(201);
  return response.headers["set-cookie"];
}

// Администратор успешно входит и получает доступ к чтению и сохранению настроек импорта.
test("administrator can authenticate and manage import settings", async () => {
  await preserveSettings(async () => {
    const cookie = await login("admin@ii.demo");
    // Cookie содержит сессию HttpOnly; /auth/me возвращает роль без хеша пароля.
    assert.ok(
      cookie.some(
        (value: string) =>
          value.includes("session=") && value.includes("HttpOnly"),
      ),
    );
    const api = request(app.getHttpServer());
    const me = await api.get("/api/auth/me").set("Cookie", cookie).expect(200);
    assert.equal(me.body.role, "ADMIN");
    assert.equal(me.body.email, "admin@ii.demo");
    assert.equal(me.body.passwordHash, undefined);
    await api.get("/api/imports/settings").set("Cookie", cookie).expect(200);
    // Оба допустимых метода сохраняются и возвращаются следующим запросом.
    for (const method of ["GET", "POST"]) {
      const settings = {
        sourceUrl: "http://localhost:4001/statistics?example=1",
        method,
      };
      const saved = await api
        .put("/api/imports/settings")
        .set("Origin", origin)
        .set("Cookie", cookie)
        .send(settings)
        .expect(200);
      assert.deepEqual(saved.body, settings);
      const read = await api
        .get("/api/imports/settings")
        .set("Cookie", cookie)
        .expect(200);
      assert.deepEqual(read.body, settings);
    }
  });
});

// Отсутствие действующей сессии и роль клиента не дают доступа к настройкам.
test("unauthenticated and non-admin users cannot manage import settings", async () => {
  await preserveSettings(async () => {
    const api = request(app.getHttpServer());
    const previous = await db.importSettings.findUnique({
      where: { key: "statistics" },
    });
    const settings = {
      sourceUrl: "http://localhost:4001/statistics",
      method: "POST",
    };
    await api.get("/api/imports/settings").expect(401);
    await api
      .put("/api/imports/settings")
      .set("Origin", origin)
      .send(settings)
      .expect(401);
    await api
      .get("/api/imports/settings")
      .set("Cookie", "session=invalid-token")
      .expect(401);
    // Клиент имеет действующую сессию, но не административные права.
    const cookie = await login("client@zerna.demo");
    await api.get("/api/imports/settings").set("Cookie", cookie).expect(403);
    await api
      .put("/api/imports/settings")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .send(settings)
      .expect(403);
    // Журнал содержит полные ответы источника и тоже доступен только администратору.
    for (const path of ["/api/imports/logs", "/api/imports/logs/1"]) {
      await api.get(path).expect(401);
      await api.get(path).set("Cookie", cookie).expect(403);
    }
    // Запрещённые операции не изменяют сохранённую настройку.
    assert.deepEqual(
      await db.importSettings.findUnique({ where: { key: "statistics" } }),
      previous,
    );
  });
});

// Неверный пароль существующего пользователя не создаёт авторизованную сессию.
test("login with an incorrect password does not create a session", async () => {
  // Agent сохраняет cookie между запросами, как браузер пользователя.
  const agent = request.agent(app.getHttpServer());
  const response = await agent
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email: "admin@ii.demo", password: "wrong-password" })
    .expect(401);

  // Проверяем сообщение об ошибке и отсутствие cookie авторизации.
  assert.equal(response.body.message, "Неверный email или пароль");
  assert.equal(response.headers["set-cookie"], undefined);

  // После неудачного входа тот же агент не получает доступ к защищённому API.
  await agent.get("/api/auth/me").expect(401);
});
