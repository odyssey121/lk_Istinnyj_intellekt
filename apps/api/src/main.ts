import "reflect-metadata";
import { Controller, Get, Module, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { Database, DatabaseModule } from "./database";
import { AuthModule } from "./auth";
import { CatalogModule } from "./catalog";
import { AnalyticsModule } from "./analytics";
import { ReviewsModule } from "./reviews";
import { ImportsModule } from "./imports";
@Controller("health")
class HealthController {
  constructor(private readonly db: Database) {}
  @Get() async health() {
    await this.db.$queryRaw`SELECT 1`;
    return { ok: true };
  }
}
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CatalogModule,
    AnalyticsModule,
    ReviewsModule,
    ImportsModule,
  ],
  controllers: [HealthController],
})
class AppModule {}
export async function createApp() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === "test" ? ["error"] : undefined,
    abortOnError: false,
  });
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.use((req: any, res: any, next: any) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin !== (process.env.APP_ORIGIN ?? "http://localhost:8080")
    )
      return res.status(403).json({ message: "Недопустимый Origin" });
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("Истинный интеллект API")
        .setVersion("1.0")
        .addCookieAuth("session")
        .build(),
    ),
  );
  app.enableShutdownHooks();
  await app.init();
  return app;
}
if (require.main === module)
  createApp().then((app) => app.listen(3000, "0.0.0.0"));
