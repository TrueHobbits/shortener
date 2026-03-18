import { Module } from '@nestjs/common';
import { RedirectController } from './redirect.controller.js';
import { UrlsModule } from '../urls/urls.module.js';

@Module({
  imports: [UrlsModule],
  controllers: [RedirectController],
})
export class RedirectModule {}
