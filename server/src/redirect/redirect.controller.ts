import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { UrlsService } from '../urls/urls.service.js';

@Controller()
export class RedirectController {
  constructor(private readonly urlsService: UrlsService) {}

  @Get(':code')
  async redirect(@Param('code') code: string, @Res() res: any) {
    const result = await this.urlsService.resolveShortCode(code);

    switch (result.status) {
      case 'not_found':
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(this.htmlPage('404', 'Ссылка не существует'));
      case 'expired':
        return res
          .status(HttpStatus.GONE)
          .send(this.htmlPage('410', 'Ссылка недействительна'));
      case 'redirect':
        return res.redirect(HttpStatus.FOUND, result.url);
    }
  }

  private htmlPage(title: string, message: string): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  }
}
