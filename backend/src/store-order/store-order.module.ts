import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoreOrder, StoreOrderSchema } from './schemas/store-order.schema';
import { StoreOrderService } from './store-order.service';
import { StoreOrderController } from './store-order.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoreOrder.name, schema: StoreOrderSchema },
    ]),
  ],
  controllers: [StoreOrderController],
  providers: [StoreOrderService],
  exports: [StoreOrderService],
})
export class StoreOrderModule {}
