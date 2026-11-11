import { randomUUID } from "node:crypto";
import { ImportLogQuery, ImportLogService } from "./import-logs";
import { IdParams } from "./scope";
import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  GatewayTimeoutException,
  Injectable,
  Module,
  NotFoundException,
  Post,
  Get,
  Put,
  UseGuards,
  Query,
  Param,
  Req,
} from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import {
  IsInt,
  IsString,
  IsIn,
  IsUrl,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ImportMethod, Prisma } from "@prisma/client";
import { Database } from "./database";
import { SessionGuard, AdminGuard, SessionRequest } from "./auth";
import { dates } from "../../../shared/statistics";
class ImportDto {
  @ApiProperty({ type: Number })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  branchId!: number;
  @ApiProperty() @IsString() dateFrom!: string;
  @ApiProperty() @IsString() dateTo!: string;
}
class ImportSettingsDto {
  @ApiProperty({ example: "http://mock:4001/statistics" })
  @IsString()
  @MaxLength(2048)
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
    require_tld: false,
  })
  sourceUrl!: string;

  @ApiProperty({ enum: ["GET", "POST"] })
  @IsIn(["GET", "POST"])
  method!: ImportMethod;
}
@Injectable()
class ImportSettingsService {
  constructor(private readonly db: Database) {}
  async get() {
    const saved = await this.db.importSettings.findUnique({
      where: { key: "statistics" },
      select: { sourceUrl: true, method: true },
    });
    return (
      saved ?? {
        sourceUrl: new URL(
          "/statistics",
          process.env.SOURCE_URL ?? "http://localhost:4001",
        ).toString(),
        method: ImportMethod.GET,
      }
    );
  }
  async save(settings: ImportSettingsDto) {
    const url = new URL(settings.sourceUrl);
    if (url.username || url.password || url.hash)
      throw new BadRequestException(
        "URL не должен содержать логин, пароль или fragment",
      );
    return this.db.importSettings.upsert({
      where: { key: "statistics" },
      create: {
        key: "statistics",
        sourceUrl: url.toString(),
        method: settings.method,
      },
      update: { sourceUrl: url.toString(), method: settings.method },
      select: { sourceUrl: true, method: true },
    });
  }
}
@Injectable()
class ImportService {
  constructor(
    private readonly db: Database,
    private readonly settings: ImportSettingsService,
    private readonly logs: ImportLogService,
  ) {}
  async run(q: ImportDto, initiatedBy: string) {
    const settings = await this.settings.get();
    let days: string[];
    try {
      days = dates(q.dateFrom, q.dateTo);
    } catch {
      throw new BadRequestException("Укажите период от 1 до 90 дней");
    }
    const branch = await this.db.branch.findUnique({
      where: { id: q.branchId },
    });
    if (!branch) throw new NotFoundException("Филиал не найден");
    const url = new URL(settings.sourceUrl);
    const parameters = {
      branchExternalId: branch.externalId,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
    };
    if (settings.method === "GET") {
      for (const [key, value] of Object.entries(parameters))
        url.searchParams.set(key, value);
    }
    const runId = randomUUID();
    let lastLogId: number | undefined;
    let payload: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await this.logs.request({
          url,
          method: settings.method,
          body:
            settings.method === "POST" ? JSON.stringify(parameters) : undefined,
          runId,
          attempt: attempt + 1,
          branchId: branch.id,
          branchName: branch.name,
          initiatedBy,
        });
        lastLogId = response.logId;
        if (response.status >= 500) throw new Error("Источник недоступен");
        if (!response.ok)
          throw new BadGatewayException("Источник отклонил запрос");
        try {
          payload = JSON.parse(response.body);
        } catch {
          await this.logs.markError(
            response.logId,
            "Некорректный ответ источника",
          );
          throw new BadGatewayException("Некорректный ответ источника");
        }
        break;
      } catch (error) {
        if (error instanceof BadGatewayException) throw error;
        if (attempt === 2) {
          if (error instanceof Error && error.name === "TimeoutError")
            throw new GatewayTimeoutException("Источник не ответил вовремя");
          throw new BadGatewayException("Источник недоступен");
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 250 * (attempt + 1)),
        );
      }
    }
    try {
      const keys = ["views", "clicks", "calls", "routes"] as const;
      if (
        payload?.branchExternalId !== branch.externalId ||
        !Array.isArray(payload?.items) ||
        payload.items.length !== days.length
      )
        throw new BadGatewayException("Неполный ответ источника");
      const seen = new Set<string>();
      for (const row of payload.items) {
        if (
          !row ||
          !days.includes(row.date) ||
          seen.has(row.date) ||
          keys.some(
            (k) =>
              !Number.isSafeInteger(row[k]) ||
              row[k] < 0 ||
              row[k] > 2147483647,
          )
        )
          throw new BadGatewayException("Некорректные показатели источника");
        seen.add(row.date);
      }
    } catch (error) {
      if (lastLogId !== undefined)
        await this.logs.markError(
          lastLogId,
          error instanceof Error ? error.message : String(error),
        );
      throw error;
    }
    const rows = payload.items.map(
      (r: any) =>
        Prisma.sql`(${branch.id},${new Date(r.date)},${r.views},${r.clicks},${r.calls},${r.routes})`,
    );
    await this.db.$transaction([
      this.db.$executeRaw(
        Prisma.sql`INSERT INTO "DailyMetric" ("branchId","date","views","clicks","calls","routes") VALUES ${Prisma.join(rows)} ON CONFLICT ("branchId","date") DO UPDATE SET "views"=EXCLUDED."views","clicks"=EXCLUDED."clicks","calls"=EXCLUDED."calls","routes"=EXCLUDED."routes"`,
      ),
    ]);
    return { ...q, processedDays: days.length };
  }
}
@ApiTags("imports")
@Controller("imports")
@UseGuards(SessionGuard, AdminGuard)
class ImportsController {
  constructor(
    private readonly service: ImportService,
    private readonly settings: ImportSettingsService,
    private readonly logs: ImportLogService,
  ) {}
  @Get("logs") listLogs(@Query() q: ImportLogQuery) {
    return this.logs.list(q);
  }
  @Get("logs/:id") getLog(@Param() params: IdParams) {
    return this.logs.get(params.id);
  }
  @Get("settings") getSettings() {
    return this.settings.get();
  }
  @Put("settings") saveSettings(@Body() body: ImportSettingsDto) {
    return this.settings.save(body);
  }
  @Post("statistics") run(@Body() body: ImportDto, @Req() req: SessionRequest) {
    return this.service.run(body, req.user.email);
  }
}
@Module({
  providers: [ImportService, ImportSettingsService, ImportLogService],
  controllers: [ImportsController],
})
export class ImportsModule {}
