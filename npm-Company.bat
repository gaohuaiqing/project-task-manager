@echo off
echo [正在切换到公司内网模式...]
:: 设置公司代理 (请替换为你公司真实的代理地址和端口)
npm config set proxy http://proxy.mindray.corp:8080
npm config set https-proxy http://proxy.mindray.corp:8080
:: 设置镜像源 (如果公司内网有私有源则改这里，没有则保持淘宝/官方)
npm config set registry https://registry.npmmirror.com
echo [切换完成！现在可以使用公司网络了。]
pause