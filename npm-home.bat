@echo off
echo [正在切换到家庭网络模式...]
:: 清除代理设置
npm config delete proxy
npm config delete https-proxy
npm config delete http-proxy
:: 确保镜像源正常
npm config set registry https://registry.npmmirror.com
echo [切换完成！现在可以直接连接外网了。]
pause