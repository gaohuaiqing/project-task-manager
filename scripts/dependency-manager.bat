@echo off
REM ============================================
REM Project Task Manager 3.0 依赖管理工具 (Windows)
REM ============================================

setlocal EnableDelayedExpansion

set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="-h" goto help
if "%1"=="--help" goto help

if "%1"=="analyze" goto analyze
if "%1"=="clean" goto clean
if "%1"=="reinstall" goto reinstall
if "%1"=="check" goto check
if "%1"=="optimize" goto optimize
if "%1"=="pnpm" goto pnpm

echo %ERROR% 未知命令: %1
goto help

:analyze
echo %INFO% 分析依赖结构...
echo.
echo 📊 依赖统计:
echo ================================

if exist "node_modules" (
    dir /b node_modules 2>nul | find /c /v "" > temp.txt
    set /p ROOT_COUNT=<temp.txt
    del temp.txt
    echo 根目录: !ROOT_COUNT! 个包
)

if exist "app\node_modules" (
    dir /b app\node_modules 2>nul | find /c /v "" > temp.txt
    set /p APP_COUNT=<temp.txt
    del temp.txt
    echo 前端 (app): !APP_COUNT! 个包
)

if exist "app\server\node_modules" (
    dir /b app\server\node_modules 2>nul | find /c /v "" > temp.txt
    set /p SERVER_COUNT=<temp.txt
    del temp.txt
    echo 后端 (app/server): !SERVER_COUNT! 个包
)

echo ================================
echo.
echo %INFO% 检查重复依赖...
call npx npm-dedupe --dry-run 2>nul || echo 需要安装 npm-dedupe: npm install -g npm-dedupe

echo.
echo %INFO% 检查未使用依赖...
call npx depcheck 2>nul || echo 需要安装 depcheck: npm install -g depcheck
goto end

:clean
echo %WARNING% 这将删除所有 node_modules 目录！
set /p CONFIRM="确认继续? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo %INFO% 已取消
    goto end
)

echo %INFO% 清理依赖...

if exist "node_modules" rmdir /s /q node_modules
if exist "app\node_modules" rmdir /s /q app\node_modules
if exist "app\server\node_modules" rmdir /s /q app\server\node_modules

echo %INFO% 清理 npm 缓存...
call npm cache clean --force

echo %SUCCESS% 清理完成！
goto end

:reinstall
echo %INFO% 重新安装依赖...

if exist "package-lock.json" (
    echo %INFO% 使用 npm ci (快速、可靠)...
    call npm ci
) else (
    echo %INFO% 使用 npm install...
    call npm install
)

echo %SUCCESS% 依赖安装完成！
goto end

:check
echo %INFO% 检查依赖更新...
echo.
call npm outdated
echo.
echo %INFO% 运行安全审计...
call npm audit
echo.
echo %WARNING% 如需更新，请运行: npm update
goto end

:optimize
echo %INFO% 优化依赖...
echo.
echo %INFO% 去重依赖...
call npx npm-dedupe 2>nul || echo %WARNING% 跳过去重（需要安装 npm-dedupe）
echo.
echo %INFO% 检查未使用依赖...
call npx depcheck 2>nul || echo %WARNING% 跳过检查（需要安装 depcheck）
echo.
echo %SUCCESS% 优化完成！
goto end

:pnpm
echo %INFO% 迁移到 pnpm...

where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %INFO% 安装 pnpm...
    call npm install -g pnpm
)

echo %INFO% 创建 pnpm-workspace.yaml...
(
echo packages:
echo   - 'app'
echo   - 'app/server'
echo   - 'packages/*'
) > pnpm-workspace.yaml

echo %WARNING% 删除现有 node_modules...
if exist "node_modules" rmdir /s /q node_modules
if exist "app\node_modules" rmdir /s /q app\node_modules
if exist "app\server\node_modules" rmdir /s /q app\server\node_modules

echo %INFO% 使用 pnpm 安装依赖...
call pnpm import
call pnpm install

echo %SUCCESS% 迁移完成！
echo %INFO% 现在可以使用 pnpm 命令了
goto end

:help
echo Project Task Manager 3.0 依赖管理工具
echo.
echo 用法: dependency-manager.bat [命令]
echo.
echo 命令:
echo   analyze     分析依赖结构
echo   clean       清理所有 node_modules
echo   reinstall   重新安装依赖
echo   check       检查依赖更新
echo   optimize    优化依赖（去重）
echo   pnpm        迁移到 pnpm
echo   help        显示此帮助信息
echo.
echo 示例:
echo   dependency-manager.bat analyze
echo   dependency-manager.bat clean

:end
endlocal
