import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OnlineRateModule } from './online-rate/online-rate.module';
import { StoreOrderModule } from './store-order/store-order.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // MongoDB 连接（使用环境变量）
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: `mongodb://${config.get('MONGODB_USERNAME')}:${encodeURIComponent(config.get('MONGODB_PASSWORD'))}@${config.get('MONGODB_HOST')}:${config.get('MONGODB_PORT')}/${config.get('MONGODB_DATABASE')}?authSource=${config.get('MONGODB_AUTH_SOURCE')}`,
      }),
    }),
    // 业务模块
    OnlineRateModule,
    StoreOrderModule,
  ],
})
export class AppModule {}
