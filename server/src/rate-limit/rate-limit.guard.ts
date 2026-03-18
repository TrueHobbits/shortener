import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { RateLimitService } from './rate-limit.service.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    let identifier: string | null = null;
    let limit = 10;

    // Try Bearer auth first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const session = await this.prisma.session.findUnique({
        where: { token },
      });
      if (session && session.expires_at > new Date()) {
        identifier = `user:${session.user_id}`;
        limit = 30;
      }
    }

    // Try guest token
    if (!identifier) {
      const guestToken = request.headers['x-guest-token'] as string | undefined;
      if (guestToken) {
        const guest = await this.prisma.guestSession.findUnique({
          where: { token: guestToken },
        });
        if (guest) {
          identifier = `guest:${guestToken}`;
          limit = 10;
          // Update last_request_at
          await this.prisma.guestSession.update({
            where: { id: guest.id },
            data: { last_request_at: new Date() },
          });
        }
      }
    }

    // No identity — let request through (auth guards will handle it)
    if (!identifier) {
      return true;
    }

    const rateCheck = this.rateLimitService.check(identifier, limit);
    if (!rateCheck.allowed) {
      response.setHeader('Retry-After', String(rateCheck.retryAfter));
      throw new HttpException(
        { error: 'rate_limit_exceeded' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
