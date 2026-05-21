import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VisitLog, VisitLogDocument } from './schemas/visit-log.schema';

@Injectable()
export class VisitLogService {
  constructor(
    @InjectModel(VisitLog.name)
    private visitLogModel: Model<VisitLogDocument>,
  ) {}

  /**
   * 上报访问记录
   */
  async reportVisit(
    ip: string,
    page: string,
    userAgent: string,
    referer: string,
  ): Promise<{ success: boolean }> {
    const now = new Date();
    const date = this.formatDate(now);

    await this.visitLogModel.create({
      ip,
      page,
      userAgent,
      referer,
      timestamp: now,
      date,
    });

    return { success: true };
  }

  /**
   * 按天聚合独立IP访问量
   * 返回 [{ date, uv }]
   */
  async getDailyStats(start: string, end: string): Promise<{ date: string; uv: number }[]> {
    const result = await this.visitLogModel.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
        },
      },
      // 第一步：按 date + ip 去重
      {
        $group: {
          _id: { date: '$date', ip: '$ip' },
        },
      },
      // 第二步：按 date 统计独立IP数
      {
        $group: {
          _id: '$_id.date',
          uv: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          uv: 1,
        },
      },
    ]);

    return result;
  }

  /**
   * 查询指定日期的IP访问详情
   */
  async getIpDetail(date: string): Promise<Partial<VisitLog>[]> {
    return this.visitLogModel
      .find({ date })
      .select('ip page userAgent timestamp -_id')
      .sort({ timestamp: -1 })
      .lean()
      .exec();
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
