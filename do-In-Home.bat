@echo off
echo "正在关闭所有代理（系统+npm+git）..."

:: 1. 清空git代理
start /wait cmd /c "git config --global --unset http.proxy > %temp%\git.log 2>&1"
start /wait cmd /c "git config --global --unset https.proxy >> %temp%\git.log 2>&1"
type %temp%\git.log
echo "git代理已清空！"

:: 2. 清空npm代理
start /wait cmd /c "npm config delete https-proxy > %temp%\npm.log 2>&1"
type %temp%\npm.log
echo "npm代理已清空！"

:: 3. 清空系统代理
call setx HTTPS_PROXY "" /M
echo "系统代理已清空！"

echo "所有代理已关闭，按任意键退出..."
pause