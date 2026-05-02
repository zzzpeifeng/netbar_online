import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StoreOrderDocument = StoreOrder & Document;

@Schema({ collection: 'store_order' })
export class StoreOrder {
  @Prop({ required: true, unique: true })
  storeName: string;

  @Prop({ required: true, default: 999 })
  order: number; // 排序值，越小越靠前

  @Prop({ default: false })
  isJim: boolean; // 是否吉姆电竞门店
}

export const StoreOrderSchema = SchemaFactory.createForClass(StoreOrder);
