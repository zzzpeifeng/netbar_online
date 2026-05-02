#!/bin/bash

# 部署脚本 - 在服务器上运行
# 使用方法: ./deploy.sh

echo "🚀 开始部署网吧数据平台..."

# 配置变量
PROJECT_DIR="/var/www/netbar_online"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_DIR="/var/log/netbar"

# 创建日志目录
echo "📁 创建日志目录..."
mkdir -p $LOG_DIR
chmod 755 $LOG_DIR

# 1. 部署后端
echo "📦 部署后端..."
cd $BACKEND_DIR

# 安装依赖
echo "  - 安装依赖..."
npm install --production

# 构建
echo "  - 构建项目..."
npm run build

# 使用 PM2 启动/重启
echo "  - 启动 PM2..."
if pm2 list | grep -q "netbar-backend"; then
    echo "  - 重启应用..."
    pm2 restart netbar-backend
else
    echo "  - 首次启动应用..."
    pm2 start ecosystem.config.js --env production
fi

# 保存 PM2 配置
pm2 save

echo "✅ 后端部署完成"

# 2. 部署前端
echo "📦 部署前端..."
cd $FRONTEND_DIR

# 安装依赖
echo "  - 安装依赖..."
npm install

# 构建
echo "  - 构建项目..."
npm run build

echo "✅ 前端构建完成"
echo "📍 前端文件位置: $FRONTEND_DIR/dist"
echo "⚠️  请配置 Nginx 指向该目录"

echo ""
echo "🎉 部署完成！"
echo ""
echo "📋 后续步骤:"
echo "  1. 配置 Nginx (参考 nginx.conf.example)"
echo "  2. 检查 PM2 状态: pm2 status"
echo "  3. 查看日志: pm2 logs netbar-backend"
echo "  4. 设置 PM2 开机自启: pm2 startup"
