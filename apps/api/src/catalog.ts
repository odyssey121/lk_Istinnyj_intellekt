import { Controller, Get, Module, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Database } from "./database";
import { Filters, Scope } from "./scope";
import { SessionGuard, SessionRequest } from "./auth";
@ApiTags("catalog")
@UseGuards(SessionGuard)
@Controller()
class CatalogController {
  constructor(
    private readonly db: Database,
    private readonly scope: Scope,
  ) {}
  @Get("companies")
  companies(@Req() req: SessionRequest) {
    return this.db.company.findMany({
      where: { id: this.scope.companyId(req.user) },
      orderBy: { name: "asc" },
    });
  }
  @Get("branches")
  async branches(@Req() req: SessionRequest, @Query() q: Filters) {
    return this.db.branch.findMany({
      where: await this.scope.branches(req.user, q),
      include: { company: true },
      orderBy: { name: "asc" },
    });
  }
}
@Module({
  controllers: [CatalogController],
  providers: [Scope],
  exports: [Scope],
})
export class CatalogModule {}
