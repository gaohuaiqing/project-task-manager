@echo off
REM ============================================
REM Project Task Manager 3.0 Windows 部署脚本
REM ============================================

setlocal EnableDelayedExpansion

REM 颜色设置（Windows 10+）
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

REM ============================================
REM 检查 Node.js
REM ============================================
:check_node
echo %INFO% 检查 Node.js...

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %ERROR% Node.js 未安装，请先安装 Node.js ^>= 18.0.0
    exit /b 1
)

echo %SUCCESS% Node.js 检查通过
node --version

REM ============================================
REM 安装依赖
REM ============================================
:install_deps
echo.
echo %INFO% 安装项目依赖...

echo %INFO% 安装前端依赖...
cd app
call npm install
if %ERRORLEVEL% neq 0 (
    echo %ERROR% 前端依赖安装失败
    exit /b 1
)

echo %INFO% 安装后端依赖...
cd server
call npm install
if %ERRORLEVEL% neq 0 (
    echo %ERROR% 后端依赖安装失败
    exit /b 1
)

cd ..\..
echo %SUCCESS% 依赖安装完成

REM ============================================
REM 构建项目
REM ============================================
:build_project
echo.
echo %INFO% 构建项目...

REM 创建构建目录
if not exist "Build\frontend" mkdir Build\frontend
if not exist "Build\backend" mkdir Build\backend

echo %INFO% 构建前端...
cd app
call npm run build
if %ERRORLEVEL% neq 0 (
    echo %ERROR% 前端构建失败
    exit /b 1
)

echo %INFO% 构建后端...
cd server
call npm run build
if %ERRORLEVEL% neq 0 (
    echo %ERROR% 后端构建失败
    exit /b 1
)

cd ..\..
echo %SUCCESS% 项目构建完成

REM ============================================
REM 初始化数据库
REM ============================================
:init_db
echo.
echo %INFO% 初始化数据库...

cd app\server
call npm run db:init
if %ERRORLEVEL% neq 0 (
    echo %WARNING% 数据库初始化失败，可能需要手动配置
)

cd ..\..
echo %SUCCESS% 数据库初始化完成

REM ============================================
REM 启动开发服务器
REM ============================================
:start_dev
echo.
echo %INFO% 启动开发服务器...

REM 检查环境变量文件
if not exist "app\server\.env" (
    echo %WARNING% 未找到 .env 文件
    if exist ".env.example" (
        echo %INFO% 从 .env.example 创建 .env 文件...
        copy .env.example app\server\.env
        echo %WARNING% 请编辑 app\server\.env 文件配置数据库连接信息
    )
)

echo.
echo %SUCCESS% ============================================
echo %SUCCESS% 部署完成！
echo %SUCCESS% ============================================
echo.
echo 启动方式:
echo.
echo 方式一：同时启动前后端（推荐）
echo   npm run dev
echo.
echo 方式二：分别启动
echo   前端: cd app ^&^& npm run dev
echo   后端: cd app\server ^&^& npm run dev
echo.
echo 访问地址:
echo   前端: http://localhost:5173
echo   后端: http://localhost:3001
echo.

pause
