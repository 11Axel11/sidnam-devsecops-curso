import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { RegisterDto } from './dto/registerDto';
import { LoginDto } from './dto/loginDto';
import { Request, Response } from 'express';
import { AuthGuard } from './guard/auth.guard';
import { RolesAccionesGuard } from './guard/actions.guard';
import { SeccionGuard } from './guard/seccion.guard';
import { AccionRequerida } from './decorators/roles.decorator';
import { SeccionRequerida } from './decorators/seccionRequerida.decorator';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from './auth-cookies';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(private readonly authService: AutenticacionService) {}

 
  @UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
  @AccionRequerida('Crear')
  @SeccionRequerida('Usuarios')
  @Post('register')
  registerAdministrador(@Body() registerDto: RegisterDto) {
    return this.authService.crearUsuario(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ) {
    const { accessToken, refreshToken, id } =
      await this.authService.login(loginDto);

    setAuthCookies(res, accessToken, refreshToken);

    return { accessToken, id };
  }

  // Sin AuthGuard: el access token ya expiró cuando se llama; la
  // autenticación es la cookie refresh_token.
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { accessToken, refreshToken, id } = await this.authService.refresh(
        req.cookies?.[REFRESH_TOKEN_COOKIE],
      );
      setAuthCookies(res, accessToken, refreshToken);
      return { accessToken, id };
    } catch (error) {
      clearAuthCookies(res);
      throw error;
    }
  }

  // Sin AuthGuard: debe poder cerrar sesión aunque el access token haya expirado.
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (refreshToken) {
      try {
        const payload = await this.authService.verifyToken(refreshToken);
        await this.authService.logout(payload.id);
      } catch {}
    }

    clearAuthCookies(res);

    return { message: 'Sesión cerrada' };
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(
    @Body() { email }: { email: string },
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: { token: string; password: string },
  ): Promise<void> {
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
    return this.authService.getUserWithPermissions(token!);
  }
}
