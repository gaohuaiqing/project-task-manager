@echo off
echo "正在关闭全局代理..."

:: 1. 用start /wait执行npm，强制等它执行完再继续
start /wait cmd /c "npm config delete https-proxy > %temp%\npm.log 2>&1"
type %temp%\npm.log  :: 显示npm执行结果
echo "npm代理已清空！"

:: 2. 执行setx，确保不跳转
call setx HTTPS_PROXY "" /M
echo "系统代理已清空！"

echo "所有操作完成，按任意键退出..."
pause