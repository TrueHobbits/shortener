import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';

const ALPHANUMERIC =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateShortCode(length: number): string {
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }
  return code;
}

@Injectable()
export class UrlsService {
  constructor(private readonly prisma: PrismaService) {}

  async shorten(
    originalUrl: string,
    title: string | undefined,
    expiresAt: string | undefined,
    userId: number | null,
    guestToken: string | null,
  ) {
    // Validate URL scheme
    if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
      throw new BadRequestException({ error: 'invalid_url_scheme' });
    }

    // Validate URL format
    try {
      const parsed = new URL(originalUrl);
      const hostname = parsed.hostname;
      // Must have a TLD (at least one dot) and no spaces
      if (!hostname.includes('.') || hostname.includes(' ') || originalUrl.includes(' ')) {
        throw new Error();
      }
    } catch {
      throw new BadRequestException({ error: 'invalid_url_format' });
    }

    const now = new Date();
    let finalExpiresAt: Date;

    if (userId) {
      // Authorized user flow
      // Active links limit
      const activeCount = await this.prisma.url.count({
        where: {
          user_id: userId,
          expires_at: { gt: now },
        },
      });
      if (activeCount >= 3) {
        throw new HttpException(
          {
            error: 'active_link_limit',
            message: 'Достигнут лимит в 3 активные ссылки',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Validate expires_at
      const maxExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      if (expiresAt) {
        finalExpiresAt = new Date(expiresAt);
        if (isNaN(finalExpiresAt.getTime())) {
          throw new BadRequestException({ error: 'invalid_date' });
        }
        if (finalExpiresAt > maxExpiry) {
          throw new BadRequestException({ error: 'expires_too_far' });
        }
      } else {
        finalExpiresAt = maxExpiry;
      }
    } else if (guestToken) {
      // Guest flow
      // Active links limit for guest: 1
      const activeCount = await this.prisma.url.count({
        where: {
          guest_token: guestToken,
          expires_at: { gt: now },
        },
      });
      if (activeCount >= 1) {
        throw new HttpException(
          {
            error: 'active_link_limit',
            message: 'У вас уже есть активная ссылка',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Guest always 15 minutes, ignore provided value
      finalExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    } else {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Generate unique short code
    const shortCode = await this.generateUniqueCode();

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const url = await this.prisma.url.create({
      data: {
        short_code: shortCode,
        original_url: originalUrl,
        title: userId ? title : undefined,
        expires_at: finalExpiresAt,
        user_id: userId || undefined,
        guest_token: guestToken || undefined,
      },
    });

    return {
      short_code: url.short_code,
      short_url: `${appUrl}/${url.short_code}`,
      expires_at: url.expires_at.toISOString(),
    };
  }

  async getUserUrls(
    userId: number,
    page: number = 1,
    limit: number = 20,
    sort: string = 'created_at',
    order: string = 'desc',
  ) {
    // Validate sort field
    const allowedSorts = ['created_at', 'expires_at', 'title'];
    if (!allowedSorts.includes(sort)) {
      sort = 'created_at';
    }
    if (order !== 'asc' && order !== 'desc') {
      order = 'desc';
    }

    const skip = (page - 1) * limit;

    const [urls, total] = await Promise.all([
      this.prisma.url.findMany({
        where: { user_id: userId },
        orderBy: { [sort]: order },
        skip,
        take: limit,
      }),
      this.prisma.url.count({
        where: { user_id: userId },
      }),
    ]);

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    return {
      data: urls.map((u) => ({
        id: u.id,
        short_code: u.short_code,
        short_url: `${appUrl}/${u.short_code}`,
        original_url: u.original_url,
        title: u.title,
        created_at: u.created_at.toISOString(),
        expires_at: u.expires_at.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async deleteUrl(code: string, userId: number) {
    const url = await this.prisma.url.findUnique({
      where: { short_code: code },
    });

    if (!url) {
      throw new NotFoundException({ error: 'not_found' });
    }

    if (url.user_id !== userId) {
      throw new ForbiddenException({ error: 'forbidden' });
    }

    await this.prisma.url.delete({
      where: { id: url.id },
    });

    return { message: 'Ссылка удалена' };
  }

  async resolveShortCode(
    code: string,
  ): Promise<
    | { status: 'redirect'; url: string }
    | { status: 'not_found' }
    | { status: 'expired' }
  > {
    const url = await this.prisma.url.findUnique({
      where: { short_code: code },
    });

    if (!url) {
      return { status: 'not_found' };
    }

    if (url.expires_at <= new Date()) {
      return { status: 'expired' };
    }

    return { status: 'redirect', url: url.original_url };
  }

  private async generateUniqueCode(
    length: number = 6,
  ): Promise<string> {
    for (let len = length; len <= length + 5; len++) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateShortCode(len);
        const existing = await this.prisma.url.findUnique({
          where: { short_code: code },
        });
        if (!existing) {
          return code;
        }
      }
    }
    // Fallback: very long code
    return generateShortCode(length + 6);
  }

}
