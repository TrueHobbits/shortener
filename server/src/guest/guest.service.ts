import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class GuestService {
  constructor(private readonly prisma: PrismaService) {}

  async createGuestToken(): Promise<{ guest_token: string }> {
    // g_ prefix + 62 hex chars = 64 total
    const randomPart = crypto.randomBytes(31).toString('hex'); // 62 chars
    const guestToken = `g_${randomPart}`;

    await this.prisma.guestSession.create({
      data: {
        token: guestToken,
      },
    });

    return { guest_token: guestToken };
  }
}
