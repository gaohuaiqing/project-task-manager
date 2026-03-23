@echo off
REM 任务管理系统 - Windows 安装脚本
REM 使用方法: 以管理员身份运行 install.bat

echo ================================
echo 任务管理系统 - 安装脚本
echo ================================
echo.

REM 检查Node.js
echo 检查 Node.js...
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo [OK] 已安装 Node.js: %NODE_VERSION%
) else (
    echo [警告] 未安装 Node.js
    echo 请从 https://nodejs.org/ 下载并安装 Node.js LTS 版本
    echo.
    pause
    exit /b 1
)

REM 检查npm
echo 检查 npm...
where npm >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
    echo [OK] 已安装 npm: %NPM_VERSION%
) else (
    echo [错误] npm 未安装
    pause
    exit /b 1
)

REM 检查MySQL
echo.
echo 检查 MySQL...
where mysql >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] 已安装 MySQL
) else (
    echo [警告] 未检测到 MySQL
    echo 请确保 MySQL 8.0 已安装并添加到系统 PATH
    echo.
)

echo.
echo ================================
echo 安装项目依赖
echo ================================

REM 安装后端依赖
echo.
echo 安装后端依赖...
cd app\server
call npm install
if %errorlevel% neq 0 (
    echo [错误] 后端依赖安装失败
    pause
    exit /b 1
)
cd ..\..

REM 安装前端依赖
echo.
echo 安装前端依赖...
cd app
call npm install
if %errorlevel% neq 0 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)
cd ..

echo.
echo ================================
echo 配置环境变量
echo ================================

REM 创建后端环境变量文件
if not exist "app\server\.env" (
    echo 创建后端环境变量文件...
    (
        echo NODE_ENV=development
        echo PORT=3001
        echo.
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_USER=root
        echo DB_PASSWORD=
        echo DB_NAME=task_manager
        echo.
        echo JWT_SECRET=your_development_secret_key_here
        echo CORS_ORIGIN=http://localhost:5173
        echo.
        echo LOG_LEVEL=debug
    ) > app\server\.env
    echo [OK] 已创建 app\server\.env
    echo [提示] 请编辑此文件配置数据库连接信息
) else (
    echo [OK] app\server\.env 已存在
)

REM 创建前端环境变量文件
if not exist "app\.env" (
    echo 创建前端环境变量文件...
    (
        echo VITE_API_BASE_URL=http://localhost:3001/api
    ) > app\.env
    echo [OK] 已创建 app\.env
) else (
    echo [OK] app\.env 已存在
)

echo.
echo ================================
echo 数据库设置
echo ================================

set /p CREATE_DB="是否创建数据库? (y/n): "
if /i "%CREATE_DB%" equ "y" (
    set /p DB_USER="数据库用户名 [task_user]: "
    if "%DB_USER%"=="" set DB_USER=task_user

    set /p DB_PASSWORD="数据库密码: "

    echo 创建数据库...
    mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS task_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS '%DB_USER%'@'localhost' IDENTIFIED BY '%DB_PASSWORD%'; GRANT ALL PRIVILEGES ON task_manager.* TO '%DB_USER%'@'localhost'; FLUSH PRIVILEGES;"

    if %errorlevel% equ 0 (
        echo [OK] 数据库创建成功
    ) else (
        echo [错误] 数据库创建失败，请检查MySQL连接
    )
)

echo.
set /p RUN_MIGRATE="是否运行数据库迁移? (y/n): "
if /i "%RUN_MIGRATE%" equ "y" (
    echo 运行数据库迁移...
    cd app\server
    call npm run migrate
    cd ..\..
    echo [OK] 数据库迁移完成
)

echo.
set /p BUILD_FRONTEND="是否构建前端? (y/n): "
if /i "%BUILD_FRONTEND%" equ "y" (
    echo 构建前端...
    cd app
    call npm run build
    cd ..
    echo [OK] 前端构建完成
)

echo.
echo ================================
echo 安装完成！
echo ================================
echo.
echo 下一步操作：
echo 1. 编辑 app\server\.env 配置环境变量
echo 2. 启动后端: cd app\server ^&^& npm run dev
echo 3. 启动前端: cd app ^&^& npm run dev
echo.
pause
