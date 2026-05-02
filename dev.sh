#!/bin/bash

# 网吧数据展示网站 - 开发环境一键启动脚本

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目根目录
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# PID 文件目录
PID_DIR="$ROOT_DIR/.pids"
mkdir -p "$PID_DIR"

BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# 日志目录
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

# 启动后端
start_backend() {
    echo -e "${YELLOW}正在启动后端服务 (NestJS)...${NC}"
    cd "$BACKEND_DIR" || exit
    npm run start:dev > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
    echo -e "${GREEN}✓ 后端服务已启动 (PID: $(cat $BACKEND_PID_FILE))${NC}"
    echo -e "  日志文件: $LOG_DIR/backend.log"
    cd "$ROOT_DIR" || exit
}

# 启动前端
start_frontend() {
    echo -e "${YELLOW}正在启动前端服务 (Vue 3 + Vite)...${NC}"
    cd "$FRONTEND_DIR" || exit
    npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
    echo -e "${GREEN}✓ 前端服务已启动 (PID: $(cat $FRONTEND_PID_FILE))${NC}"
    echo -e "  日志文件: $LOG_DIR/frontend.log"
    cd "$ROOT_DIR" || exit
}

# 停止后端
stop_backend() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}正在停止后端服务 (PID: $PID)...${NC}"
            kill "$PID" 2>/dev/null
            rm "$BACKEND_PID_FILE"
            echo -e "${GREEN}✓ 后端服务已停止${NC}"
        else
            echo -e "${YELLOW}后端服务未运行${NC}"
            rm "$BACKEND_PID_FILE" 2>/dev/null
        fi
    else
        echo -e "${YELLOW}后端服务未运行${NC}"
    fi
}

# 停止前端
stop_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}正在停止前端服务 (PID: $PID)...${NC}"
            kill "$PID" 2>/dev/null
            rm "$FRONTEND_PID_FILE"
            echo -e "${GREEN}✓ 前端服务已停止${NC}"
        else
            echo -e "${YELLOW}前端服务未运行${NC}"
            rm "$FRONTEND_PID_FILE" 2>/dev/null
        fi
    else
        echo -e "${YELLOW}前端服务未运行${NC}"
    fi
}

# 停止所有服务
stop_all() {
    echo -e "${YELLOW}正在停止所有服务...${NC}"
    stop_backend
    stop_frontend
    echo -e "${GREEN}✓ 所有服务已停止${NC}"
}

# 查看状态
status() {
    echo -e "${YELLOW}=== 服务状态 ===${NC}"
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "后端服务: ${GREEN}运行中 (PID: $PID)${NC}"
        else
            echo -e "后端服务: ${RED}未运行 (PID文件存在但进程不存在)${NC}"
            rm "$BACKEND_PID_FILE" 2>/dev/null
        fi
    else
        echo -e "后端服务: ${RED}未运行${NC}"
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "前端服务: ${GREEN}运行中 (PID: $PID)${NC}"
        else
            echo -e "前端服务: ${RED}未运行 (PID文件存在但进程不存在)${NC}"
            rm "$FRONTEND_PID_FILE" 2>/dev/null
        fi
    else
        echo -e "前端服务: ${RED}未运行${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}=== 访问地址 ===${NC}"
    echo "后端API: http://localhost:3000"
    echo "前端页面: http://localhost:5173"
}

# 查看日志
logs() {
    SERVICE=$1
    if [ "$SERVICE" == "backend" ]; then
        tail -f "$LOG_DIR/backend.log"
    elif [ "$SERVICE" == "frontend" ]; then
        tail -f "$LOG_DIR/frontend.log"
    else
        echo "用法: $0 logs [backend|frontend]"
        exit 1
    fi
}

# 主函数
case "$1" in
    start)
        start_backend
        sleep 2
        start_frontend
        echo ""
        status
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        start_backend
        sleep 2
        start_frontend
        echo ""
        status
        ;;
    status)
        status
        ;;
    logs)
        logs $2
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "命令说明:"
        echo "  start    - 启动前后端服务"
        echo "  stop     - 停止前后端服务"
        echo "  restart  - 重启前后端服务"
        echo "  status   - 查看服务状态"
        echo "  logs     - 查看日志 (backend|frontend)"
        echo ""
        echo "示例:"
        echo "  $0 start          # 启动服务"
        echo "  $0 status         # 查看状态"
        echo "  $0 logs backend   # 查看后端日志"
        exit 1
        ;;
esac

exit 0
