import {
  BadRequestException,
  Controller,
  Get,
  Injectable,
  Module,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { Database } from "./database";
import { Filters, period, Scope } from "./scope";
import { SessionGuard, SessionRequest } from "./auth";
import { CatalogModule } from "./catalog";
import { dates, day } from "../../../shared/statistics";
@Injectable()
class AnalyticsService {
  constructor(
    private readonly db: Database,
    private readonly scope: Scope,
  ) {}
  async where(user: User, q: Filters) {
    const from = q.dateFrom || undefined;
    const to = q.dateTo || undefined;
    let date: { gte?: Date; lte?: Date } | undefined;
    if (from && to) {
      const days = period({ dateFrom: from, dateTo: to });
      date = { gte: new Date(days[0]), lte: new Date(days.at(-1)!) };
    } else if (from || to) {
      const bound = from ?? to!;
      try {
        dates(bound, bound);
      } catch {
        throw new BadRequestException("Некорректная дата");
      }
      date = from ? { gte: new Date(from) } : { lte: new Date(to!) };
    }
    return { branch: await this.scope.branches(user, q), date };
  }
  async summary(user: User, q: Filters) {
    const where = await this.where(user, q);
    const [metrics, reviews] = await Promise.all([
      this.db.dailyMetric.aggregate({
        where,
        _sum: { views: true, clicks: true, calls: true, routes: true },
      }),
      this.db.review.aggregate({ where, _avg: { rating: true }, _count: true }),
    ]);
    return {
      views: metrics._sum.views ?? 0,
      clicks: metrics._sum.clicks ?? 0,
      calls: metrics._sum.calls ?? 0,
      routes: metrics._sum.routes ?? 0,
      rating: reviews._avg.rating,
      reviews: reviews._count,
    };
  }
  async timeseries(user: User, q: Filters) {
    const from = q.dateFrom || undefined;
    const to = q.dateTo || undefined;
    let selectedDays: string[] | undefined;
    if (from && to) {
      selectedDays = period({ dateFrom: from, dateTo: to });
    } else if (from || to) {
      const bound = from ?? to!;
      try {
        dates(bound, bound);
      } catch {
        throw new BadRequestException("Некорректная дата");
      }
    }
    const rows = await this.db.dailyMetric.groupBy({
      by: ["date"],
      where: {
        branch: await this.scope.branches(user, q),
        date:
          from || to
            ? {
                gte: from ? new Date(from) : undefined,
                lte: to ? new Date(to) : undefined,
              }
            : undefined,
      },
      _sum: { views: true },
      orderBy: { date: "asc" },
    });
    const values = new Map(
      rows.map((r) => [r.date.toISOString().slice(0, 10), r._sum.views ?? 0]),
    );
    if (selectedDays)
      return selectedDays.map((date) => ({
        date,
        views: values.get(date) ?? 0,
      }));
    if (!rows.length) return [];
    const start = from ? Date.parse(from) : rows[0].date.getTime();
    const end = to ? Date.parse(to) : rows.at(-1)!.date.getTime();
    return Array.from({ length: (end - start) / day + 1 }, (_, i) => {
      const date = new Date(start + i * day).toISOString().slice(0, 10);
      return { date, views: values.get(date) ?? 0 };
    });
  }
}
@ApiTags("analytics")
@Controller("analytics")
@UseGuards(SessionGuard)
class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get("summary") summary(@Req() r: SessionRequest, @Query() q: Filters) {
    return this.service.summary(r.user, q);
  }
  @Get("timeseries") timeseries(@Req() r: SessionRequest, @Query() q: Filters) {
    return this.service.timeseries(r.user, q);
  }
}
@Module({
  imports: [CatalogModule],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
