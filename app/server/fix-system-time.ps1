# 系统时间自动校正脚本
# 需要管理员权限运行

Write-Host "=== 系统时间自动校正工具 ===" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ 错误: 需要管理员权限运行此脚本" -ForegroundColor Red
    Write-Host ""
    Write-Host "请按以下步骤操作:" -ForegroundColor Yellow
    Write-Host "1. 右键点击 PowerShell" -ForegroundColor Yellow
    Write-Host "2. 选择 '以管理员身份运行'" -ForegroundColor Yellow
    Write-Host "3. 运行此脚本: .\fix-system-time.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 管理员权限检查通过" -ForegroundColor Green
Write-Host ""

# 显示当前系统时间
$currentTime = Get-Date
Write-Host "当前系统时间: $($currentTime.ToString('yyyy/MM/dd HH:mm:ss'))" -ForegroundColor Yellow
Write-Host ""

# 从网络时间服务器获取准确时间
Write-Host "正在从网络时间服务器同步..." -ForegroundColor Cyan

try {
    # 尝试使用 NTP 服务器
    $ntpServers = @("pool.ntp.org", "time.windows.com", "time.nist.gov")
    $networkTime = $null

    foreach ($server in $ntpServers) {
        try {
            Write-Host "  尝试连接 $server ..." -ForegroundColor Gray
            $w32tm = & w32tm /stripchart /computer:$server /samples:1 /dataonly 2>&1 | Select-String "(\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2})"

            if ($w32tm) {
                if ($w32tm.Matches[0].Value -match '(\d{2}/\d{2}/\d{4}) (\d{2}:\d{2}:\d{2})') {
                    $networkTime = [DateTime]::ParseExact("$($Matches[1]) $($Matches[2])", "MM/dd/yyyy HH:mm:ss", [CultureInfo]::InvariantCulture)
                    Write-Host "  ✅ 成功获取网络时间" -ForegroundColor Green
                    break
                }
            }
        } catch {
            Write-Host "  ⚠️  连接失败: $server" -ForegroundColor Yellow
            continue
        }
    }

    # 如果 NTP 失败，使用 Windows 时间服务
    if (-not $networkTime) {
        Write-Host "  使用 Windows 时间服务..." -ForegroundColor Gray
        & w32tm /resync /force | Out-Null
        Start-Sleep -Seconds 2
        $networkTime = Get-Date
    }

    # 设置系统时间
    Write-Host ""
    Write-Host "正在设置系统时间..." -ForegroundColor Cyan
    Set-Date -Date $networkTime -ErrorAction Stop

    $newTime = Get-Date
    Write-Host "✅ 系统时间已更新" -ForegroundColor Green
    Write-Host ""
    Write-Host "新的系统时间: $($newTime.ToString('yyyy/MM/dd HH:mm:ss'))" -ForegroundColor Green

    # 验证时间更改
    $timeDiff = [Math]::Abs(($newTime - $currentTime).TotalMinutes)
    Write-Host ""
    Write-Host "时间调整量: $($timeDiff.ToString('F0')) 分钟" -ForegroundColor Cyan

    if ($timeDiff -gt 60) {
        Write-Host ""
        Write-Host "⚠️  警告: 时间调整较大，建议重启相关服务" -ForegroundColor Yellow
        Write-Host "  - 数据库服务" -ForegroundColor Yellow
        Write-Host "  - Node.js 应用" -ForegroundColor Yellow
    }

} catch {
    Write-Host ""
    Write-Host "❌ 自动设置失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "请尝试手动设置:" -ForegroundColor Yellow
    Write-Host "1. 运行: w32tm /resync /force" -ForegroundColor Yellow
    Write-Host "2. 或在系统设置中手动调整日期和时间" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
