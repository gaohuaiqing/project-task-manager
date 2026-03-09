@echo off
REM 性能优化快速应用脚本 (Windows 版本)
REM
REM 使用方法：
REM scripts\apply-performance-optimization.bat

setlocal enabledelayedexpansion

echo [INFO] 开始应用性能优化...
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 未安装
    exit /b 1
)

REM 检查项目目录
if not exist "package.json" (
    echo [ERROR] package.json 未找到，请确保在项目根目录执行此脚本
    exit /b 1
)

echo [INFO] 环境检查完成
echo.

REM 应用数据库索引
echo [INFO] 应用数据库性能优化索引...
cd app/server

echo [INFO] 编译 TypeScript...
call npm run build

echo [INFO] 运行数据库迁移...
node dist/migrations/006-add-performance-indexes.js

cd ..\..

echo [SUCCESS] 数据库索引应用完成
echo.

REM 重启服务器
echo [INFO] 重启服务器...
cd app/server

echo [INFO] 停止当前服务器...
call npm run stop

echo [INFO] 等待进程结束...
timeout /t 2 /nobreak >nul

echo [INFO] 启动服务器...
start /B npm run start

cd ..\..

echo [INFO] 等待服务器启动...
timeout /t 5 /nobreak >nul

REM 验证服务器
echo [INFO] 验证服务器状态...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] 服务器启动成功
) else (
    echo [WARNING] 服务器可能未启动成功
)

echo.
echo [INFO] ==========================================
echo [INFO] 🎉 性能优化已应用！
echo [INFO] ==========================================
echo [INFO]
echo [INFO] 下一步操作：
echo [INFO] 1. 打开浏览器访问 http://localhost:3000
echo [INFO] 2. 打开开发者工具 Console 标签页
echo [INFO] 3. 刷新页面观察性能日志
echo [INFO]
echo [INFO] 预期性能指标：
echo [INFO] - 首次加载: ^< 500ms
echo [INFO] - 缓存命中: ^< 100ms
echo [INFO] - 数据库查询: ^< 50ms
echo [INFO]
echo [INFO] 如需查看详细报告：
echo [INFO] type docs\analysis\FRONTEND_LOADING_PERFORMANCE_ANALYSIS.md
echo [INFO] ==========================================
echo.
echo [SUCCESS] 性能优化应用完成！

pause
