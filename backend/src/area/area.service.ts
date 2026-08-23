import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { Area, AreaDocument } from './schemas/area.schema';
import { StoreOrder, StoreOrderDocument } from '../store-order/schemas/store-order.schema';

const OTHER_AREA_ID = '__OTHER__';

export interface AreaWithStores {
  _id: string;
  name: string;
  order: number;
  isVirtual?: boolean;
  storeIds: string[];
  stores: any[];
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class AreaService {
  constructor(
    @InjectModel(Area.name)
    private areaModel: Model<AreaDocument>,
    @InjectModel(StoreOrder.name)
    private storeOrderModel: Model<StoreOrderDocument>,
  ) {}

  /**
   * 查询所有区（含"其他"虚拟区及其门店）
   */
  async findAllWithStores(): Promise<AreaWithStores[]> {
    const realAreas = await this.areaModel
      .find()
      .sort({ order: 1 })
      .populate({
        path: 'storeIds',
        options: { sort: { order: 1 } },
        populate: { path: 'areaId', select: '_id name' },
      })
      .lean()
      .exec();

    const orphanStores = await this.storeOrderModel
      .find({ areaId: null })
      .sort({ order: 1 })
      .populate('areaId', '_id name')
      .lean()
      .exec();

    const otherArea: AreaWithStores = {
      _id: OTHER_AREA_ID,
      name: '其他',
      order: 9999,
      isVirtual: true,
      storeIds: orphanStores.map((s: any) => s._id.toString()),
      stores: orphanStores as StoreOrderDocument[],
    };

    const result = realAreas.map((a: any) => ({
      ...a,
      _id: a._id.toString(),
      stores: a.storeIds || [],
      storeIds: (a.storeIds || []).map((s: any) =>
        typeof s === 'object' && s._id ? s._id.toString() : s?.toString(),
      ),
    }));

    result.push(otherArea);
    return result.sort((a, b) => a.order - b.order);
  }

  /**
   * 创建区
   */
  async createArea(name: string, order?: number): Promise<AreaDocument> {
    try {
      const realAreas = await this.areaModel.find().exec();
      const nextOrder =
        order != null ? order : Math.max(0, ...realAreas.map((a) => a.order)) + 1;
      const created = await this.areaModel.create({ name, order: nextOrder });
      return created;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new BadRequestException('区名已存在');
      }
      throw err;
    }
  }

  /**
   * 更新区
   */
  async updateArea(id: string, data: { name?: string; order?: number }): Promise<AreaDocument> {
    if (id === OTHER_AREA_ID) {
      throw new BadRequestException('【其他】虚拟区不可修改');
    }
    const area = await this.areaModel.findById(id).exec();
    if (!area) {
      throw new BadRequestException('区不存在');
    }
    if (data.name != null) area.name = data.name;
    if (data.order != null) area.order = data.order;
    try {
      return await area.save();
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new BadRequestException('区名已存在');
      }
      throw err;
    }
  }

  /**
   * 删除区（该区门店自动回收到"其他"）
   */
  async deleteArea(id: string): Promise<{ success: boolean; storesRecycled: number }> {
    if (id === OTHER_AREA_ID) {
      throw new BadRequestException('【其他】虚拟区不可删除');
    }
    const area = await this.areaModel.findById(id).exec();
    if (!area) {
      throw new BadRequestException('区不存在');
    }
    const updateRes = await this.storeOrderModel
      .updateMany({ areaId: new Types.ObjectId(id) as any }, { $set: { areaId: null } })
      .exec();
    await this.areaModel.deleteOne({ _id: id }).exec();
    return { success: true, storesRecycled: updateRes.modifiedCount || 0 };
  }

  /**
   * 移动单门店到指定区（targetAreaId = __OTHER__ 表示移到"其他"）
   */
  async moveStoreToArea(
    storeName: string,
    targetAreaId: string,
  ): Promise<{ success: boolean; moved: boolean }> {
    const store = await this.storeOrderModel.findOne({ storeName }).exec();
    if (!store) {
      throw new BadRequestException('门店不存在');
    }
    const realTargetId = targetAreaId === OTHER_AREA_ID ? null : targetAreaId;
    const oldAreaIdObj: any = (store as any).areaId;
    const oldAreaId = oldAreaIdObj ? (typeof oldAreaIdObj === 'object' ? oldAreaIdObj.toString() : String(oldAreaIdObj)) : null;

    if (oldAreaId === null && realTargetId === null) {
      return { success: true, moved: false };
    }
    if (oldAreaId && realTargetId && oldAreaId === realTargetId) {
      return { success: true, moved: false };
    }

    // 从旧区 storeIds 移除
    if (oldAreaId) {
      await this.areaModel
        .updateOne({ _id: new Types.ObjectId(oldAreaId) }, { $pull: { storeIds: (store as any)._id } })
        .exec();
    }

    if (realTargetId === null) {
      (store as any).areaId = null;
    } else {
      await this.areaModel
        .updateOne(
          { _id: new Types.ObjectId(realTargetId) },
          { $addToSet: { storeIds: (store as any)._id } },
        )
        .exec();
      (store as any).areaId = new Types.ObjectId(realTargetId);
    }
    await store.save();
    return { success: true, moved: true };
  }

  /**
   * 全量覆盖区下门店
   */
  async setStoresForArea(
    areaId: string,
    storeNames: string[],
  ): Promise<{ added: number; removed: number; notFound: string[] }> {
    if (areaId === OTHER_AREA_ID) {
      throw new BadRequestException('【其他】为虚拟区，不支持全量覆盖；可通过"移出本区"操作使门店归入【其他】');
    }
    const area = await this.areaModel.findById(areaId).exec();
    if (!area) {
      throw new BadRequestException('区不存在');
    }
    const matchedStores = await this.storeOrderModel
      .find({ storeName: { $in: storeNames } })
      .select('_id storeName areaId')
      .exec();
    const matchedSet = new Set(matchedStores.map((s) => s.storeName));
    const notFound = storeNames.filter((n) => !matchedSet.has(n));

    const newIds = matchedStores.map((s) => (s as any)._id);
    const oldIds: Types.ObjectId[] = Array.isArray(area.storeIds) ? (area.storeIds as any[]) : [];
    const oldIdSet = new Set(oldIds.map((o) => o.toString()));
    const newIdSet = new Set(newIds.map((n) => n.toString()));

    const toRemove = oldIds.filter((id) => !newIdSet.has(id.toString()));
    const toAdd = newIds.filter((id) => !oldIdSet.has(id.toString()));

    if (toRemove.length > 0) {
      await this.storeOrderModel
        .updateMany({ _id: { $in: toRemove } }, { $set: { areaId: null } })
        .exec();
    }

    if (toAdd.length > 0) {
      // 1. 在门店记录上写入新 areaId
      await this.storeOrderModel
        .updateMany({ _id: { $in: toAdd } }, { $set: { areaId: new Types.ObjectId(areaId) } })
        .exec();
      // 2. 从被移动门店的"旧区"里，从 storeIds 移除
      const movedStores = matchedStores.filter((s) => {
        const sAreaId = (s as any).areaId;
        if (!sAreaId) return true;
        const sid = typeof sAreaId === 'object' ? sAreaId.toString() : String(sAreaId);
        return sid !== areaId;
      });
      const oldAreaToStores = new Map<string, Types.ObjectId[]>();
      for (const s of movedStores) {
        const sAreaId = (s as any).areaId;
        if (!sAreaId) continue;
        const sid = typeof sAreaId === 'object' ? sAreaId.toString() : String(sAreaId);
        if (sid === areaId) continue;
        if (!oldAreaToStores.has(sid)) oldAreaToStores.set(sid, []);
        oldAreaToStores.get(sid)!.push((s as any)._id);
      }
      for (const [oldId, storeIds] of oldAreaToStores.entries()) {
        await this.areaModel
          .updateOne({ _id: new Types.ObjectId(oldId) }, { $pull: { storeIds: { $in: storeIds } } })
          .exec();
      }
    }

    area.storeIds = newIds;
    await area.save();

    return { added: toAdd.length, removed: toRemove.length, notFound };
  }

  /**
   * 兜底一致性：由 storeOrder.areaId 反向回填所有 Area.storeIds
   */
  async _syncAreaStoreIds(areaId?: string): Promise<void> {
    const allStores = await this.storeOrderModel.find().select('_id areaId').exec();
    const byArea = new Map<string, Types.ObjectId[]>();
    for (const s of allStores) {
      const aid = (s as any).areaId;
      if (!aid) continue;
      const key = typeof aid === 'object' ? aid.toString() : String(aid);
      if (!byArea.has(key)) byArea.set(key, []);
      byArea.get(key)!.push((s as any)._id);
    }
    const areaFilter = areaId
      ? { _id: new Types.ObjectId(areaId) }
      : {};
    const areas = await this.areaModel.find(areaFilter).select('_id storeIds').exec();
    for (const a of areas) {
      const key = a._id.toString();
      const correct = byArea.get(key) || [];
      (a as any).storeIds = correct;
      await a.save();
    }
  }
}
