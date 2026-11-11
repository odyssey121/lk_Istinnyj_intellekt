import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { IsIn } from "class-validator";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { Database } from "./database";
import { IdParams, period, ReviewFilters, Scope } from "./scope";
import { SessionGuard, SessionRequest } from "./auth";
import { CatalogModule } from "./catalog";
import { dates } from "../../../shared/statistics";
class StatusDto {
  @ApiProperty({ enum: ["NEW", "IN_PROGRESS", "DONE"] })
  @IsIn(["NEW", "IN_PROGRESS", "DONE"])
  status!: "NEW" | "IN_PROGRESS" | "DONE";
}
@ApiTags("reviews")
@Controller("reviews")
@UseGuards(SessionGuard)
class ReviewsController {
  constructor(
    private readonly db: Database,
    private readonly scope: Scope,
  ) {}
  @Get()
  async list(@Req() r: SessionRequest, @Query() q: ReviewFilters) {
    const from = q.dateFrom || undefined;
    const to = q.dateTo || undefined;
    let date: { gte?: Date; lte?: Date } | undefined;
    if (from || to) {
      if (from && to) {
        const days = period({ dateFrom: from, dateTo: to });
        date = { gte: new Date(days[0]), lte: new Date(days.at(-1)!) };
      } else {
        const bound = from ?? to!;
        try {
          dates(bound, bound);
        } catch {
          throw new BadRequestException("Некорректная дата");
        }
        date = from ? { gte: new Date(from) } : { lte: new Date(to!) };
      }
    }
    const where = {
      branch: await this.scope.branches(r.user, q),
      date,
      rating: q.rating,
      status: q.status,
    };
    const [items, total] = await Promise.all([
      this.db.review.findMany({
        where,
        include: { branch: { select: { name: true } } },
        orderBy: [{ date: "desc" }, { id: "asc" }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.db.review.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
  @Patch(":id/status")
  async update(
    @Req() r: SessionRequest,
    @Param() params: IdParams,
    @Body() body: StatusDto,
  ) {
    const { id } = params;
    const result = await this.db.review.updateMany({
      where: { id, branch: await this.scope.branches(r.user, {}) },
      data: { status: body.status },
    });
    if (!result.count) throw new NotFoundException("Отзыв не найден");
    return { id, status: body.status };
  }
}
@Module({ imports: [CatalogModule], controllers: [ReviewsController] })
export class ReviewsModule {}
