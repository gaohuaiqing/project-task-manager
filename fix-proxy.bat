@echo off
REM ============================================================
REM 修复企业代理导致的本地开发问题
REM ============================================================

echo 正在配置 NO_PROXY 环境变量...

setx NO_PROXY "localhost,127.0.0.1,10.8.180.55"
setx HTTP_PROXY "http://proxy.mindray.corp:8080"
setx HTTPS_PROXY "http://proxy.mindray.corp:8080"

echo.
echo ============================================================
echo 环境变量已配置！请执行以下操作：
echo ============================================================
echo.
echo 1. 重启您的终端（命令行/PowerShell）
echo 2. 重启浏览器
echo 3. 刷新页面 http://localhost:5173
echo.
echo 然后就可以正常登录了！
echo.
pause
