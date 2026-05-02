import { Controller, Get, Post, Body } from '@nestjs/common';
import { StoreOrderService } from './store-order.service';

@Controller('store-order')
export class StoreOrderController {
  constructor(private readonly storeOrderService: StoreOrderService) {}

  /**
   * 获取门店排序配置列表
   */
  @Get('list')
  async getStoreOrderList() {
    return this.storeOrderService.getStoreOrderList();
  }

  /**
   * 更新门店排序配置
   */
  @Post('update')
  async updateStoreOrder(@Body() data: any[]) {
    if (!Array.isArray(data)) {
      return { error: '数据格式错误，需要数组' };
    }
    return this.storeOrderService.updateStoreOrder(data);
  }

  /**
   * 重置门店排序为默认
   */
  @Post('reset')
  async resetStoreOrder() {
    return this.storeOrderService.resetStoreOrder();
  }
}
