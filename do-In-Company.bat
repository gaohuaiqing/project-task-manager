@echo off
echo "正在配置公司代理（系统+npm+git）..."

:: 1. 配置git代理
start /wait cmd /c "git config --global http.proxy http://proxy.mindray.corp:8080 > %temp%\git.log 2>&1"
start /wait cmd /c "git config --global https.proxy http://proxy.mindray.corp:8080 >> %temp%\git.log 2>&1"
type %temp%\git.log
echo "git代理配置完成！"

:: 2. 配置npm代理
start /wait cmd /c "npm config set https-proxy http://proxy.mindray.corp:8080 > %temp%\npm.log 2>&1"
type %temp%\npm.log
echo "npm代理配置完成！"

:: 3. 配置系统代理
call setx HTTPS_PROXY "http://proxy.mindray.corp:8080" /M
echo "系统代理配置完成！"

echo "所有代理配置完成，按任意键退出..."
pause