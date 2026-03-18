import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module.js';
import { RateLimitModule } from './rate-limit/rate-limit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { GuestModule } from './guest/guest.module.js';
import { UrlsModule } from './urls/urls.module.js';
import { RedirectModule } from './redirect/redirect.module.js';
import { CleanupService } from './cleanup/cleanup.service.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ...(process.env.NODE_ENV === 'production'
      ? [
          ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), '..', 'client', 'dist'),
            exclude: ['/api/(.*)'],
          }),
        ]
      : []),
    PrismaModule,
    RateLimitModule,
    AuthModule,
    GuestModule,
    UrlsModule,
    // RedirectModule MUST be last so /:code catch-all doesn't intercept /api/* routes
    RedirectModule,
  ],
  providers: [CleanupService],
})
export class AppModule {}
