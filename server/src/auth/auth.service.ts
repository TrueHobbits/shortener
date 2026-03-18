import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    email: string,
    password: string,
    captchaToken?: string,
  ): Promise<{ message: string }> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new BadRequestException({ error: 'invalid_email' });
    }

    if (!password || password.length < 1) {
      throw new BadRequestException({ error: 'invalid_password' });
    }

    // CAPTCHA validation
    if (process.env.CAPTCHA_ENABLED === 'true') {
      if (!captchaToken) {
        throw new BadRequestException({ error: 'captcha_failed' });
      }
      const captchaValid = await this.validateCaptcha(captchaToken);
      if (!captchaValid) {
        throw new BadRequestException({ error: 'captcha_failed' });
      }
    }

    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException({ error: 'email_taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    await this.prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
      },
    });

    return {
      message: 'Регистрация успешна',
    };
  }

  async login(
    authHeader: string,
  ): Promise<{ token: string; expires_at: string }> {
    // Parse Basic auth
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new UnauthorizedException({ error: 'invalid_credentials' });
    }

    const base64 = authHeader.slice(6);
    let decoded: string;
    try {
      decoded = Buffer.from(base64, 'base64').toString('utf-8');
    } catch {
      throw new UnauthorizedException({ error: 'invalid_credentials' });
    }

    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) {
      throw new UnauthorizedException({ error: 'invalid_credentials' });
    }

    const email = decoded.slice(0, colonIndex);
    const password = decoded.slice(colonIndex + 1);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException({ error: 'invalid_credentials' });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new UnauthorizedException({ error: 'invalid_credentials' });
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.session.create({
      data: {
        user_id: user.id,
        token: sessionToken,
        expires_at: expiresAt,
      },
    });

    return {
      token: sessionToken,
      expires_at: expiresAt.toISOString(),
    };
  }

  async logout(authHeader: string): Promise<{ message: string }> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice(7);
    const session = await this.prisma.session.findUnique({
      where: { token },
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    await this.prisma.session.delete({
      where: { id: session.id },
    });

    return { message: 'Вы вышли из системы' };
  }

  private async validateCaptcha(token: string): Promise<boolean> {
    try {
      const secret = process.env.CAPTCHA_SECRET;
      if (!secret) return false;
      const res = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
        { method: 'POST' },
      );
      const data = (await res.json()) as { success: boolean };
      return data.success;
    } catch {
      return false;
    }
  }
}
