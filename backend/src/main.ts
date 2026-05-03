import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用 CORS，允许前端访问
  app.enableCors({
    origin: true,  // 允许所有来源（开发环境）
    credentials: true,
  });
  
  // 全局前缀
  app.setGlobalPrefix('api');
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend is running on: ${await app.getUrl()}`);
}
bootstrap();
