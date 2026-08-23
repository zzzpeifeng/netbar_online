import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AreaDocument = Area & Document;

@Schema({ collection: 'area', timestamps: true })
export class Area {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, default: 999 })
  order: number;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'StoreOrder' }], default: [] })
  storeIds: MongooseSchema.Types.ObjectId[];
}

export const AreaSchema = SchemaFactory.createForClass(Area);
