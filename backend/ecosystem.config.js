const path = require('path');
const fs = require('fs');

// 自动检测 backend 目录路径
const backendDir = process.cwd();

module.exports = {
  apps: [
    {
      name: 'netbar-backend',
      script: 'dist/main.js',
      cwd: backendDir,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/netbar/error.log',
      out_file: '/var/log/netbar/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
