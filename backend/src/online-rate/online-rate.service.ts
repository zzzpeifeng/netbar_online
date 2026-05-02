import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnlineRate, OnlineRateDocument } from './schemas/online-rate.schema';

@Injectable()
export class OnlineRateService {
  constructor(
    @InjectModel(OnlineRate.name)
    private onlineRateModel: Model<OnlineRateDocument>,
  ) {}

  /**
   * 获取有数据的日期列表（倒序）
   */
  async getAvailableDates(): Promise<string[]> {
    const dates = await this.onlineRateModel.distinct('sheet_date');
    return dates.sort().reverse();
  }

  /**
   * 获取指定日期的上座率数据
   * 当天数据：当前时间之前显示真实数据，之后显示 0/0
   */
  async getOnlineRateData(date: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();
    
    // 获取指定日期的所有文档
    const documents = await this.onlineRateModel.find({ sheet_date: date }).exec();
    
    if (!documents || documents.length === 0) {
      return [];
    }

    // 按门店分组数据
    const storeMap = new Map<string, any>();
    
    documents.forEach((doc) => {
      const data = doc.data;
      
      // 遍历所有时间段（10, 11, 12, ..., 23）
      Object.keys(data).forEach((timeKey) => {
        const hour = parseInt(timeKey);
        const time = `${timeKey.toString().padStart(2, '0')}:00`;
        
        // 遍历该时间段的所有门店
        Object.keys(data[timeKey]).forEach((storeName) => {
          const value = data[timeKey][storeName];
          
          // 初始化门店数据
          if (!storeMap.has(storeName)) {
            storeMap.set(storeName, {
              storeName,
              timeSlots: {},
            });
          }
          
          const store = storeMap.get(storeName);
          
          // 解析 "在线/总数" 格式
          let onlineCount = 0;
          let totalCount = 0;
          
          if (typeof value === 'string' && value.includes('/')) {
            const [online, total] = value.split('/').map(Number);
            onlineCount = online || 0;
            totalCount = total || 0;
          }
          
          // 如果是当天且时间在当前时间之后，显示 0/0
          if (date === today && hour > currentHour) {
            store.timeSlots[time] = {
              onlineCount: 0,
              totalCount: 0,
              percentage: 0,
            };
          } else {
            const percentage = totalCount > 0 
              ? Math.round((onlineCount / totalCount) * 100) 
              : 0;
            store.timeSlots[time] = {
              onlineCount,
              totalCount,
              percentage,
            };
          }
        });
      });
    });

    return Array.from(storeMap.values());
  }

  /**
   * 从 Excel 文件导入数据
   * Excel 格式：sheet_date 为日期，data 字段包含时间点和门店数据
   */
  async importFromExcel(filePath: string): Promise<any> {
    const XLSX = require('xlsx');
    const fs = require('fs');
    const path = require('path');
    
    try {
      // 读取 Excel 文件
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 解析文件名获取日期（格式：2026-04.xlsx）
      const fileName = path.basename(filePath);
      const dateMatch = fileName.match(/(\d{4}-\d{2})/);
      
      if (!dateMatch) {
        throw new Error('文件名必须包含日期（格式：YYYY-MM）');
      }
      
      const yearMonth = dateMatch[1];
      
      // 获取 sheet_date（从 MongoDB 现有数据推断，或从文件名推断）
      // 假设 Excel 中的 sheet_date 格式为 "2026-04-01"
      // 我们需要从 worksheet 中读取所有日期
      
      // 将 worksheet 转换为 JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!data || data.length < 2) {
        throw new Error('Excel 文件为空或格式不正确');
      }
      
      // 假设第一行是表头，第一列是门店名称，后续列是时间
      const headers = data[0] as string[];
      let importCount = 0;
      
      // 从第二行开始遍历
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length === 0) continue;
        
        const storeName = row[0]?.toString().trim();
        if (!storeName) continue;
        
        // 遍历所有时间列
        for (let j = 1; j < headers.length; j++) {
          const timeHeader = headers[j]?.toString();
          if (!timeHeader) continue;
          
          // 解析时间（格式：2026-04-01 12:00）
          const dateMatch = timeHeader.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}):00/);
          if (!dateMatch) continue;
          
          const sheetDate = dateMatch[1];
          const hour = parseInt(dateMatch[2]);
          const time = `${hour.toString().padStart(2, '0')}:00`;
          
          const value = row[j]?.toString().trim();
          if (!value) continue;
          
          // 解析 "在线/总数" 格式
          let onlineCount = 0;
          let totalCount = 0;
          
          if (value.includes('/')) {
            const [online, total] = value.split('/').map(Number);
            onlineCount = online || 0;
            totalCount = total || 0;
          }
          
          // 检查是否已存在
          const existing = await this.onlineRateModel.findOne({
            sheet_date: sheetDate,
          });
          
          if (existing) {
            // 更新现有文档的 data 字段
            if (!existing.data[time]) {
              existing.data[time] = {};
            }
            existing.data[time][storeName] = value;
            await existing.save();
          } else {
            // 创建新文档
            await this.onlineRateModel.create({
              sheet_date: sheetDate,
              data: {
                [time]: {
                  [storeName]: value
                }
              }
            });
          }
          
          importCount++;
        }
      }
      
      // 删除上传的文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return {
        success: true,
        count: importCount,
        message: `成功导入 ${importCount} 条数据`,
      };
    } catch (error) {
      console.error('导入失败:', error);
      throw error;
    }
  }
}
