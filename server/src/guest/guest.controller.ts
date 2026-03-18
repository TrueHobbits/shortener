import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { GuestService } from './guest.service.js';

@Controller('api')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Get('guest-token')
  @HttpCode(HttpStatus.OK)
  async getGuestToken() {
    return this.guestService.createGuestToken();
  }
}
