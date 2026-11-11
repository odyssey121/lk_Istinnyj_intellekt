import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Prisma, User } from "@prisma/client";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { dates, day, today } from "../../../shared/statistics";
import { Database } from "./database";
export class IdParams {
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483647) id!: number;
}
export class Filters {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  companyId?: number;
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  branchId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
}
export class ReviewFilters extends Filters {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
  @ApiPropertyOptional({ enum: ["NEW", "IN_PROGRESS", "DONE"] })
  @IsOptional()
  @IsIn(["NEW", "IN_PROGRESS", "DONE"])
  status?: "NEW" | "IN_PROGRESS" | "DONE";
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}
/**
 * Возвращает список дат выбранного периода включительно.
 * Без dateTo используется сегодня, без dateFrom — дата за 29 дней до конца периода.
 * Неверные даты и периоды длиннее 90 дней отклоняются с ошибкой 400.
 */
export function period(q: Filters) {
  const to = q.dateTo ?? today();
  if (!Number.isFinite(Date.parse(to)))
    throw new BadRequestException("Некорректная дата");
  const from =
    q.dateFrom ??
    new Date(Date.parse(to) - 29 * day).toISOString().slice(0, 10);
  try {
    return dates(from, to);
  } catch {
    throw new BadRequestException("Укажите корректный период от 1 до 90 дней");
  }
}
@Injectable()
export class Scope {
  // NestJS передаёт подключение к базе, чтобы проверять доступ к выбранному филиалу.
  constructor(private readonly db: Database) {}
  /** Полный доступ разрешён только ADMIN; остальные роли ограничены своей компанией. */
  companyId(user: User, selectedCompanyId?: number): number | undefined {
    if (user.role === "ADMIN") return selectedCompanyId;
    if (user.companyId == null)
      throw new ForbiddenException("Пользователь не привязан к компании");
    if (selectedCompanyId !== undefined && selectedCompanyId !== user.companyId)
      throw new ForbiddenException("Компания недоступна");
    return user.companyId;
  }

  async branches(user: User, q: Filters): Promise<Prisma.BranchWhereInput> {
    const companyId = this.companyId(user, q.companyId);
    if (
      q.branchId &&
      !(await this.db.branch.findFirst({
        where: { id: q.branchId, companyId },
      }))
    )
      throw new NotFoundException("Филиал не найден");
    return { companyId, id: q.branchId };
  }
}
