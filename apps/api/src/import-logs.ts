import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ImportMethod } from "@prisma/client";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Database } from "./database";
export class ImportLogQuery {
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
type SourceRequest = {
  url: URL;
  method: ImportMethod;
  body?: string;
  runId: string;
  attempt: number;
  branchId: number;
  branchName: string;
  initiatedBy: string;
};
@Injectable()
export class ImportLogService {
  constructor(private readonly db: Database) {}
  async list(q: ImportLogQuery) {
    const [items, total] = await this.db.$transaction([
      this.db.importLog.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          id: true,
          runId: true,
          attempt: true,
          redirect: true,
          branchId: true,
          branchName: true,
          initiatedBy: true,
          createdAt: true,
          finishedAt: true,
          durationMs: true,
          method: true,
          url: true,
          responseStatus: true,
          error: true,
        },
      }),
      this.db.importLog.count(),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
  async get(id: number) {
    const log = await this.db.importLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException("Запись журнала не найдена");
    return log;
  }
  async markError(id: number, error: string) {
    await this.db.importLog.update({ where: { id }, data: { error } });
  }
  // Каждое фактическое HTTP-обращение, включая перенаправления, имеет отдельную запись.
  async request(input: SourceRequest) {
    let url = input.url,
      method = input.method,
      body = input.body;
    const signal = AbortSignal.timeout(5000);
    for (let redirect = 0; redirect <= 5; redirect++) {
      const requestHeaders: Record<string, string> =
        method === "POST" ? { "Content-Type": "application/json" } : {};
      const log = await this.db.importLog.create({
        data: {
          runId: input.runId,
          attempt: input.attempt,
          redirect,
          branchId: input.branchId,
          branchName: input.branchName,
          initiatedBy: input.initiatedBy,
          method,
          url: url.toString(),
          requestHeaders,
          requestBody: body ?? null,
        },
      });
      const start = performance.now();
      let response: Response | undefined,
        responseBody: string | undefined,
        error: string | undefined;
      let responseHeaders: Record<string, string> | undefined;
      try {
        response = await fetch(url, {
          method,
          headers: requestHeaders,
          body,
          signal,
          redirect: "manual",
        });
        responseHeaders = Object.fromEntries(response.headers);
        responseBody = "";
        const decoder = new TextDecoder();
        const reader = response.body?.getReader();
        if (reader) {
          try {
            while (true) {
              const chunk = await reader.read();
              if (chunk.done) break;
              responseBody += decoder.decode(chunk.value, { stream: true });
            }
          } finally {
            responseBody += decoder.decode();
            reader.releaseLock();
          }
        }
        if (
          !response.ok &&
          ![301, 302, 303, 307, 308].includes(response.status)
        )
          error = "HTTP " + response.status;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        throw e;
      } finally {
        await this.db.importLog.update({
          where: { id: log.id },
          data: {
            finishedAt: new Date(),
            durationMs: Math.round(performance.now() - start),
            responseStatus: response?.status,
            responseHeaders,
            responseBody,
            error,
          },
        });
      }
      if (
        [301, 302, 303, 307, 308].includes(response.status) &&
        response.headers.get("location")
      ) {
        if (redirect === 5) {
          await this.markError(
            log.id,
            "Слишком много перенаправлений источника",
          );
          throw new BadGatewayException(
            "Слишком много перенаправлений источника",
          );
        }
        let next: URL;
        try {
          next = new URL(response.headers.get("location")!, url);
        } catch {
          await this.markError(log.id, "Некорректный адрес перенаправления");
          throw new BadGatewayException("Некорректный адрес перенаправления");
        }
        if (
          !["http:", "https:"].includes(next.protocol) ||
          next.username ||
          next.password
        ) {
          await this.markError(log.id, "Некорректный адрес перенаправления");
          throw new BadGatewayException("Некорректный адрес перенаправления");
        }
        if (
          response.status === 303 ||
          ((response.status === 301 || response.status === 302) &&
            method === "POST")
        ) {
          method = ImportMethod.GET;
          body = undefined;
        }
        url = next;
        continue;
      }
      return {
        logId: log.id,
        status: response.status,
        ok: response.ok,
        body: responseBody!,
      };
    }
    throw new BadGatewayException("Источник недоступен");
  }
}
