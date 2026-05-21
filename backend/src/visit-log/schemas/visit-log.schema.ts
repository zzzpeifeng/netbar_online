import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VisitLogDocument = VisitLog & Document;

@Schema({ collection: 'visit_logs', timestamps: true })
export class VisitLog {
  @Prop({ required: true, index: true })
  ip: string;

  @Prop({ required: true, index: true })
  page: string;

  @Prop()
  userAgent: string;

  @Prop()
  referer: string;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ required: true, index: true })
  date: string; // YYYY-MM-DD
}

export const VisitLogSchema = SchemaFactory.createForClass(VisitLog);

// 复合索引：按日期+IP聚合加速
VisitLogSchema.index({ date: 1, ip: 1 });
