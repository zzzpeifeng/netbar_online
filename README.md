# 网吧数据展示平台

供吉姆网吧管理者使用的网吧数据展示系统，用于对比自家门店与竞争对手的实时上座率数据。

## 功能特性

- 📊 实时上座率监控（12:00-23:00）
- 🏪 多门店数据对比
- 📱 移动端适配（H5 页面）
- 🔍 门店筛选与搜索
- 📈 数据可视化图表

## 技术栈

### 前端
- Vue 3 (Composition API)
- Vue Router
- Tailwind CSS
- ECharts
- Vite

### 后端
- NestJS
- MongoDB (Mongoose)
- TypeScript

## 项目结构

```
netbar_online/
├── backend/          # 后端服务
│   ├── src/
│   │   ├── online-rate/      # 上座率模块
│   │   └── store-order/      # 门店排序模块
│   ├── .env.example          # 环境变量示例
│   └── .gitignore
├── frontend/        # 前端应用
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # 公共组件
│   │   └── router/          # 路由配置
│   └── .gitignore
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 16
- MongoDB >= 4.4
- npm 或 yarn

### 后端启动

```bash
cd backend
cp .env.example .env  # 复制环境变量配置
# 修改 .env 中的数据库配置
npm install
npm run start:dev
```

后端默认运行在 `http://localhost:3000`

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`

### H5 页面访问

移动端页面访问：`http://localhost:5173/h5`

## 环境变量说明

### 后端 (.env)

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| MONGODB_HOST | MongoDB 主机地址 | 127.0.0.1 |
| MONGODB_PORT | MongoDB 端口 | 27017 |
| MONGODB_USERNAME | 数据库用户名 | - |
| MONGODB_PASSWORD | 数据库密码 | - |
| MONGODB_DATABASE | 数据库名称 | netbar_data |
| MONGODB_AUTH_SOURCE | 认证数据库 | admin |
| PORT | 应用端口 | 3000 |
| NODE_ENV | 运行环境 | development |

## 数据导入

使用后端提供的脚本导入历史数据：

```bash
cd backend
node import_store_order.js  # 导入门店排序配置
```

## 开发说明

### 代码规范

- 前端使用 Tailwind CSS 进行样式开发
- 后端使用 NestJS 标准项目结构
- 遵循 ESLint 和 Prettier 配置

### 注意事项

- ⚠️ **请勿将 `.env` 文件提交到仓库**
- ⚠️ 数据库密码等敏感信息应存储在环境变量中
- 提交前请检查是否有可能泄漏敏感信息的文件

## 许可证

MIT License
