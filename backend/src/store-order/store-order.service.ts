import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StoreOrder, StoreOrderDocument } from './schemas/store-order.schema';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class StoreOrderService {
  constructor(
    @InjectModel(StoreOrder.name)
    private storeOrderModel: Model<StoreOrderDocument>,
  ) {}

  /**
   * 获取门店排序配置列表
   */
  async getStoreOrderList(): Promise<StoreOrder[]> {
    return this.storeOrderModel.find().sort({ order: 1 }).exec();
  }

  /**
   * 更新门店排序配置
   */
  async updateStoreOrder(data: any[]): Promise<any> {
    let updateCount = 0;
    
    for (const item of data) {
      const { storeName, order, isJim } = item;
      
      const existing = await this.storeOrderModel.findOne({ storeName });
      
      if (existing) {
        existing.order = order;
        if (isJim !== undefined) {
          existing.isJim = isJim;
        }
        await existing.save();
        updateCount++;
      } else {
        await this.storeOrderModel.create({
          storeName,
          order,
          isJim,
        });
        updateCount++;
      }
    }

    return {
      success: true,
      count: updateCount,
      message: `成功更新 ${updateCount} 条配置`,
    };
  }

  /**
   * 重置门店排序为默认（从 shop_order_reorganized.json 读取）
   */
  async resetStoreOrder(): Promise<any> {
    // 读取默认配置文件
    const configPath = path.join(__dirname, '..', '..', '..', 'shop_order_reorganized.json');
    
    if (!fs.existsSync(configPath)) {
      throw new Error('默认配置文件不存在');
    }

    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // 清空现有数据
    await this.storeOrderModel.deleteMany({});
    
    // 导入默认配置
    let importCount = 0;
    for (const item of configData) {
      await this.storeOrderModel.create({
        storeName: item.storeName,
        order: item.order,
        isJim: item.isJim || false,
      });
      importCount++;
    }

    return {
      success: true,
      count: importCount,
      message: `成功重置 ${importCount} 条配置`,
    };
  }
}
