import { Controller, Get, Query, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OnlineRateService } from './online-rate.service';

@Controller('online-rate')
export class OnlineRateController {
  constructor(private readonly onlineRateService: OnlineRateService) {}

  /**
   * 获取有数据的日期列表（倒序）
   */
  @Get('dates')
  async getAvailableDates() {
    return this.onlineRateService.getAvailableDates();
  }

  /**
   * 获取指定日期的上座率数据
   */
  @Get('query')
  async getOnlineRateData(@Query('date') date: string) {
    if (!date) {
      return { error: '缺少 date 参数' };
    }
    return this.onlineRateService.getOnlineRateData(date);
  }

  /**
   * 从 Excel 导入数据
   */
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importFromExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: '请上传文件' };
    }

    const filePath = require('path').join(__dirname, '..', 'common', 'uploads', file.filename);
    return this.onlineRateService.importFromExcel(filePath);
  }
}
