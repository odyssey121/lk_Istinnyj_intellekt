import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Global,
  Injectable,
  Module,
  Post,
  Get,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { compare } from "bcryptjs";
import { Request, Response } from "express";
import { User } from "@prisma/client";
import { Database } from "./database";
export type SessionRequest = Request & { user: User };
export class LoginDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) password!: string;
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<SessionRequest>();
    try {
      const token = this.jwt.verify(req.cookies?.session);
      if (!Number.isInteger(token.sub) || token.sub < 1) throw new Error();
      const user = await this.db.user.findUnique({ where: { id: token.sub } });
      if (!user) throw new Error();
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException("Войдите в систему");
    }
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (
      context.switchToHttp().getRequest<SessionRequest>().user.role !== "ADMIN"
    )
      throw new ForbiddenException("Доступно только администратору");
    return true;
  }
}
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}
  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.db.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !(await compare(body.password, user.passwordHash)))
      throw new UnauthorizedException("Неверный email или пароль");
    res.cookie("session", this.jwt.sign({ sub: user.id }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 8 * 3600 * 1000,
      path: "/",
    });
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
  }
  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("session", { path: "/" });
    return { ok: true };
  }
  @Get("me")
  @UseGuards(SessionGuard)
  me(@Req() req: SessionRequest) {
    const { id, email, role, companyId } = req.user;
    return { id, email, role, companyId };
  }
}
@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "8h" },
    }),
  ],
  controllers: [AuthController],
  providers: [SessionGuard, AdminGuard],
  exports: [SessionGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
