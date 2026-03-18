import { Module } from '@nestjs/common';
import { UrlsController } from './urls.controller.js';
import { UrlsService } from './urls.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [UrlsController],
  providers: [UrlsService],
  exports: [UrlsService],
})
export class UrlsModule {}
