import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AreaService } from './area.service';

@Controller('area')
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  /**
   * 获取区列表（含门店详情，含【其他】虚拟区）
   */
  @Get('list')
  async getAreaList() {
    try {
      const data = await this.areaService.findAllWithStores();
      return { success: true, data };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: err?.message || '查询失败' },
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建区
   */
  @Post('create')
  async createArea(@Body() body: { name: string; order?: number }) {
    if (!body || !body.name || !String(body.name).trim()) {
      throw new BadRequestException('区名称必填');
    }
    try {
      const data = await this.areaService.createArea(
        String(body.name).trim(),
        body.order,
      );
      return { success: true, data };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: err?.message || '创建失败' },
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 更新区
   */
  @Post('update/:id')
  async updateArea(@Param('id') id: string, @Body() body: { name?: string; order?: number }) {
    try {
      const data = await this.areaService.updateArea(id, {
        name: body.name != null ? String(body.name).trim() : undefined,
        order: body.order,
      });
      return { success: true, data };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: err?.message || '更新失败' },
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 删除区
   */
  @Post('delete/:id')
  async deleteArea(@Param('id') id: string) {
    try {
      const result = await this.areaService.deleteArea(id);
      return result;
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: err?.message || '删除失败' },
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 移动单门店到指定区（id=__OTHER__ 表示归到"其他"）
   */
  @Post(':id/move-store')
  async moveStore(@Param('id') id: string, @Body() body: { storeName: string }) {
    if (!body || !body.storeName) {
      throw new BadRequestException('storeName 必填');
    }
    try {
      const result = await this.areaService.moveStoreToArea(body.storeName, id);
      return result;
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: err?.message || '移动失败' },
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 全量覆盖区下门店
   */
  @Post(':id/set-stores')
  async setStores(@Param('id') id: string, @Body() body: { storeNames?: string[] }) {
    const storeNames = Array.isArray(body?.storeNames) ? body.storeNames : [];
    try {
      const result = await this.areaService.setStoresForArea(id, storeNames);
      return { success: true, ...result };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: err?.message || '设置失败' },
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
