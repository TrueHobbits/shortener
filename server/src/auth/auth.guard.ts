import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw new UnauthorizedException();
    }

    const session = await this.prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.expires_at <= new Date()) {
      throw new UnauthorizedException();
    }

    (request as any).userId = session.user_id;
    return true;
  }
}
