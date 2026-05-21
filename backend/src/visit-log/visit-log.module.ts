import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VisitLog, VisitLogSchema } from './schemas/visit-log.schema';
import { VisitLogService } from './visit-log.service';
import { VisitLogController } from './visit-log.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VisitLog.name, schema: VisitLogSchema },
    ]),
  ],
  controllers: [VisitLogController],
  providers: [VisitLogService],
  exports: [VisitLogService],
})
export class VisitLogModule {}
