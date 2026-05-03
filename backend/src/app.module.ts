import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OnlineRateModule } from './online-rate/online-rate.module';
import { StoreOrderModule } from './store-order/store-order.module';

@Module({
  imports: [
    // 配置模块（显式指定 .env 文件路径）
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // 显式指定 .env 文件
    }),
    // MongoDB 连接（使用环境变量）
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const username = config.get<string>('MONGODB_USERNAME', 'admin');
        const password = config.get<string>('MONGODB_PASSWORD', '');
        const host = config.get<string>('MONGODB_HOST', 'localhost');
        const port = config.get<number>('MONGODB_PORT', 27017);
        const database = config.get<string>('MONGODB_DATABASE', 'netbar_data');
        const authSource = config.get<string>('MONGODB_AUTH_SOURCE', 'admin');
        
        // 调试：打印连接信息（不包含密码）
        console.log('📦 MongoDB 连接配置:');
        console.log(`  Host: ${host}:${port}`);
        console.log(`  Database: ${database}`);
        console.log(`  Username: ${username}`);
        console.log(`  Auth Source: ${authSource}`);
        console.log(`  Password Length: ${password.length}`);
        
        const uri = `mongodb://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}?authSource=${authSource}`;
        console.log(`  URI (部分): mongodb://${username}:***@${host}:${port}/${database}?authSource=${authSource}`);
        
        return {
          uri,
        };
      },
    }),
    // 业务模块
    OnlineRateModule,
    StoreOrderModule,
  ],
})
export class AppModule {}
