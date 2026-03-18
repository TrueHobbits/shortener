import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CleanupService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCleanup() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    await this.prisma.url
      .deleteMany({
        where: {
          guest_token: { not: null },
          expires_at: { lt: oneHourAgo },
        },
      })
      .catch(() => {});

    await this.prisma.guestSession
      .deleteMany({
        where: {
          last_request_at: { lt: oneHourAgo },
          urls: { none: {} },
        },
      })
      .catch(() => {});
  }
}
