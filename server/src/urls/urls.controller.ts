import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UrlsService } from './urls.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('api')
export class UrlsController {
  constructor(
    private readonly urlsService: UrlsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('shorten')
  @HttpCode(HttpStatus.CREATED)
  async shorten(
    @Body() body: { url: string; title?: string; expires_at?: string },
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-guest-token') guestTokenHeader: string | undefined,
  ) {
    let userId: number | null = null;
    let guestToken: string | null = null;

    // Try Bearer auth first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const session = await this.prisma.session.findUnique({
        where: { token },
      });
      if (session && session.expires_at > new Date()) {
        userId = session.user_id;
      }
    }

    // Try guest token if no user
    if (!userId && guestTokenHeader) {
      const guest = await this.prisma.guestSession.findUnique({
        where: { token: guestTokenHeader },
      });
      if (guest) {
        guestToken = guestTokenHeader;
      }
    }

    // Neither found
    if (!userId && !guestToken) {
      throw new UnauthorizedException();
    }

    return this.urlsService.shorten(
      body.url,
      body.title,
      body.expires_at,
      userId,
      guestToken,
    );
  }

  @Get('urls')
  @UseGuards(AuthGuard)
  async getUserUrls(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    const userId = req.userId as number;
    return this.urlsService.getUserUrls(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      sort || 'created_at',
      order || 'desc',
    );
  }

  @Delete('urls/:code')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteUrl(@Param('code') code: string, @Req() req: any) {
    const userId = req.userId as number;
    return this.urlsService.deleteUrl(code, userId);
  }
}
