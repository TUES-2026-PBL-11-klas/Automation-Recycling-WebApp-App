import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// The global throttle is 100/min across every route, which would allow roughly
// 144,000 password guesses a day against a single account. Credential endpoints
// get their own far tighter budget.
const CREDENTIAL_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

type AuthUser = { userId: string; email: string; role: string };

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle(CREDENTIAL_THROTTLE)
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Throttle(CREDENTIAL_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const result = this.authService.login(user);
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      // Without this the browser will still send the session cookie over plain
      // HTTP, so it stays exposed even once TLS is in front of the app.
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    });
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'Logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: { user: AuthUser }) {
    return req.user;
  }
}
