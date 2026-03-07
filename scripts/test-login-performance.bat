@echo off
setlocal enabledelayedexpansion

REM ============================================
REM 登录性能测试脚本 (Windows)
REM ============================================

REM 配置
set SERVER_URL=http://localhost:3001
set ITERATIONS=10
set USERNAME=admin
set PASSWORD=admin123

echo ============================================
echo 登录性能测试 - 登录数据库访问性能优化
echo ============================================
echo 服务器地址: %SERVER_URL%
echo 测试次数: %ITERATIONS%
echo 用户名: %USERNAME%
echo.

REM 检查 curl 是否可用
where curl >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo 错误: curl 命令不可用，请安装 curl 或使用 Windows 10+
    exit /b 1
)

REM 检查服务器是否运行
echo 检查服务器状态...
curl -s -o nul -w "%%{http_code}" "%SERVER_URL%/health" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo 失败: 服务器未响应或未启动
    exit /b 1
)
echo 正常
echo.

REM 测试 1: 功能测试
echo --------------------------------------------
echo 测试 1: 功能测试
echo --------------------------------------------
echo 执行登录请求...

set "JSON={\"username\":\"%USERNAME%\",\"password\":\"%PASSWORD%\",\"ip\":\"local\"}"

curl -s -X POST "%SERVER_URL%/api/login" -H "Content-Type: application/json" -d "%JSON%" > login_response.json

findstr /C:"\"success\":true" login_response.json >nul
if %ERRORLEVEL% neq 0 (
    echo 失败: 登录请求失败
    type login_response.json
    del login_response.json
    exit /b 1
)

echo 成功
del login_response.json
echo.

REM 测试 2: 性能测试
echo --------------------------------------------
echo 测试 2: 性能测试（%ITERATIONS% 次登录）
echo --------------------------------------------

set /a TOTAL_TIME=0
set /a SUCCESS_COUNT=0
set /a FAIL_COUNT=0

for /L %%i in (1,1,%ITERATIONS%) do (
    REM 使用 PowerShell 获取开始时间（毫秒）
    for /f "delims=" %%T in ('powershell -command "Get-Date -Format %%"%%"%%s%%%"ff"') do set START_TIME=%%T

    curl -s -X POST "%SERVER_URL%/api/login" -H "Content-Type: application/json" -d "%JSON%" > nul

    REM 使用 PowerShell 获取结束时间（毫秒）
    for /f "delims=" %%T in ('powershell -command "Get-Date -Format %%"%%"%%s%%%"ff"') do set END_TIME=%%T

    REM 计算持续时间（简单减法，假设在 1 秒内完成）
    set /a DURATION=!END_TIME! - !START_TIME!

    if !DURATION! geq 0 (
        set /a SUCCESS_COUNT+=1
        set /a TOTAL_TIME+=!DURATION!
        echo   [%%i/%ITERATIONS%] 成功 !DURATION!ms
    ) else (
        set /a FAIL_COUNT+=1
        echo   [%%i/%ITERATIONS%] 失败
    )
)

REM 计算统计信息
if %SUCCESS_COUNT% gtr 0 (
    set /a AVG_TIME=%TOTAL_TIME% / %SUCCESS_COUNT%
) else (
    set AVG_TIME=0
)

REM 测试 3: 连接池状态
echo.
echo --------------------------------------------
echo 测试 3: 数据库连接池状态
echo --------------------------------------------
curl -s "%SERVER_URL%/api/db-pool-status"
echo.

REM 测试 4: 缓存状态
echo --------------------------------------------
echo 测试 4: 缓存状态
echo --------------------------------------------
curl -s -o nul -w "Redis: %%{http_code}" "%SERVER_URL%/health/redis"
echo.

REM 结果汇总
echo.
echo ============================================
echo 测试结果汇总
echo ============================================
echo 成功登录: %SUCCESS_COUNT%/%ITERATIONS%
echo 失败登录: %FAIL_COUNT%/%ITERATIONS%

if %SUCCESS_COUNT% gtr 0 (
    echo 平均响应时间: %AVG_TIME%ms

    REM 性能评估
    if %AVG_TIME% lss 100 (
        echo 性能评估: 优秀 (目标: ^<100ms)
    ) else if %AVG_TIME% lss 200 (
        echo 性能评估: 良好 (目标: ^<200ms)
    ) else (
        echo 性能评估: 需优化 (目标: ^<200ms)
    )
) else (
    echo 性能评估: 无法评估 (无成功登录)
)

echo.
echo ============================================
echo 性能优化目标
echo ============================================
echo 正常登录:     ^< 150ms
echo IP获取优化:   移除外部请求 (0-10s -^> 0ms)
echo 用户信息缓存: 50-200ms -^> 1-5ms
echo 连接池优化:   高并发流畅处理
echo ============================================

REM 退出码
if %FAIL_COUNT% equ 0 (
    exit /b 0
) else (
    exit /b 1
)
