import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: { email: string; password: string; captcha_token?: string },
  ) {
    return this.authService.register(
      body.email,
      body.password,
      body.captcha_token,
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Headers('authorization') authHeader: string) {
    return this.authService.login(authHeader);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Headers('authorization') authHeader: string) {
    return this.authService.logout(authHeader);
  }
}
