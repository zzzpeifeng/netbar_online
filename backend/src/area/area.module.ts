import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Area, AreaSchema } from './schemas/area.schema';
import { StoreOrder, StoreOrderSchema } from '../store-order/schemas/store-order.schema';
import { AreaService } from './area.service';
import { AreaController } from './area.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Area.name, schema: AreaSchema },
      { name: StoreOrder.name, schema: StoreOrderSchema },
    ]),
  ],
  controllers: [AreaController],
  providers: [AreaService],
  exports: [AreaService],
})
export class AreaModule {}
