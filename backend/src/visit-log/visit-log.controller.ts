import { Controller, Post, Get, Query, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { VisitLogService } from './visit-log.service';

@Controller('visit-log')
export class VisitLogController {
  constructor(private readonly visitLogService: VisitLogService) {}

  /**
   * 上报访问
   */
  @Post('report')
  async reportVisit(
    @Req() req: Request,
    @Body() body: { page?: string },
  ) {
    // 从请求头获取真实IP（优先 X-Forwarded-For）
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : req.ip || req.socket?.remoteAddress || 'unknown';

    const page = body.page || '/';
    const userAgent = (req.headers['user-agent'] as string) || '';
    const referer = (req.headers['referer'] as string) || '';

    return this.visitLogService.reportVisit(ip, page, userAgent, referer);
  }

  /**
   * 获取每日独立IP统计
   */
  @Get('daily-stats')
  async getDailyStats(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    if (!start || !end) {
      return { error: '缺少 start 或 end 参数' };
    }
    return this.visitLogService.getDailyStats(start, end);
  }

  /**
   * 获取指定日期的IP访问详情
   */
  @Get('ip-detail')
  async getIpDetail(@Query('date') date: string) {
    if (!date) {
      return { error: '缺少 date 参数' };
    }
    return this.visitLogService.getIpDetail(date);
  }
}
