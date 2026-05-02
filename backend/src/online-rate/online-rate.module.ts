import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OnlineRate, OnlineRateSchema } from './schemas/online-rate.schema';
import { OnlineRateService } from './online-rate.service';
import { OnlineRateController } from './online-rate.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OnlineRate.name, schema: OnlineRateSchema },
    ]),
  ],
  controllers: [OnlineRateController],
  providers: [OnlineRateService],
  exports: [OnlineRateService],
})
export class OnlineRateModule {}
