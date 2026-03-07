@echo off
echo ========================================
echo Admin 用户修复工具
echo ========================================
echo.

cd /d "%~dp0"

echo 正在检查并修复 admin 用户...
echo.

node fix-admin-user.js

echo.
echo ========================================
echo 按任意键退出...
pause > nul
