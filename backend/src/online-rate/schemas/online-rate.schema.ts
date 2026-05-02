import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OnlineRateDocument = OnlineRate & Document;

@Schema({ collection: 'online_rate_new' })
export class OnlineRate {
  @Prop({ required: true, index: true })
  sheet_date: string; // YYYY-MM-DD

  @Prop({ required: true, type: Object })
  data: Record<string, Record<string, string>>; // { "10": { "门店名称": "在线/总数", ... }, ... }
}

export const OnlineRateSchema = SchemaFactory.createForClass(OnlineRate);
