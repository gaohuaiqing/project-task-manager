@echo off
echo "正在配置公司代理..."

start /wait cmd /c "npm config set https-proxy "http://proxy.mindray.corp:8080" > %temp%\npm.log 2>&1"
type %temp%\npm.log
echo "npm代理配置完成！"

call setx HTTPS_PROXY "http://proxy.mindray.corp:8080" /M
echo "系统代理配置完成！"

echo "所有操作完成，按任意键退出..."
pause   