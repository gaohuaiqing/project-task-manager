# PPTX文件差异分析工具
$ErrorActionPreference = "Stop"

# 获取文件1
$downloads = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "*.pptx" | Where-Object { $_.Name -like "*2026-03-07-v1.1*" }
$file1 = $downloads | Select-Object -First 1

# 获取文件2
$eDrive = Get-PSDrive E
$workPath = "E:\WorkDocuments"
$deptFolder = Get-ChildItem $workPath -Directory | Where-Object { $_.Name -like "*部门*" }
$yearFolder = Get-ChildItem $deptFolder.FullName -Directory | Where-Object { $_.Name -like "*2026*" }
$reportFolder = Get-ChildItem $yearFolder.FullName -Directory | Where-Object { $_.Name -like "*管理汇报*" }
$file2 = Get-ChildItem $reportFolder.FullName -Filter "*2026-03-07-v1.1*.pptx" | Select-Object -First 1

Write-Host "=== 文件信息对比 ===" -ForegroundColor Green
Write-Host "文件1: $($file1.Name)"
Write-Host "  路径: $($file1.FullName)"
Write-Host "  大小: $($file1.Length) 字节"
Write-Host "  修改时间: $($file1.LastWriteTime)"

Write-Host "`n文件2: $($file2.Name)"
Write-Host "  路径: $($file2.FullName)"
Write-Host "  大小: $($file2.Length) 字节"
Write-Host "  修改时间: $($file2.LastWriteTime)"

Write-Host "`n=== 差异分析 ===" -ForegroundColor Green
$sizeDiff = $file2.Length - $file1.Length
Write-Host "大小差异: $sizeDiff 字节"

# 计算哈希
$hash1 = Get-FileHash $file1.FullName -Algorithm MD5
$hash2 = Get-FileHash $file2.FullName -Algorithm MD5

Write-Host "`n文件1 MD5: $($hash1.Hash)"
Write-Host "文件2 MD5: $($hash2.Hash)"
Write-Host "哈希相同: $($hash1.Hash -eq $hash2.Hash)"

# 检查Zone.Identifier
Write-Host "`n=== 安全标识检查 ===" -ForegroundColor Green
$zoneId1 = "$($file1.FullName):Zone.Identifier"
$zoneId2 = "$($file2.FullName):Zone.Identifier"

Write-Host "文件1 Zone.Identifier:"
if (Test-Path $zoneId1) {
    Write-Host "  存在，来自互联网"
    Get-Content $zoneId1
} else {
    Write-Host "  不存在"
}

Write-Host "`n文件2 Zone.Identifier:"
if (Test-Path $zoneId2) {
    Write-Host "  存在，来自互联网"
    Get-Content $zoneId2
} else {
    Write-Host "  不存在"
}

# 内部结构分析
Write-Host "`n=== 内部结构分析 ===" -ForegroundColor Green
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip1 = [System.IO.Compression.ZipFile]::OpenRead($file1.FullName)
$zip2 = [System.IO.Compression.ZipFile]::OpenRead($file2.FullName)

Write-Host "文件1内部文件数: $($zip1.Entries.Count)"
Write-Host "文件2内部文件数: $($zip2.Entries.Count)"

$files1 = @($zip1.Entries | ForEach-Object { $_.Name })
$files2 = @($zip2.Entries | ForEach-Object { $_.Name })

$onlyIn1 = $files1 | Where-Object { $_ -notin $files2 }
$onlyIn2 = $files2 | Where-Object { $_ -notin $files1 }

if ($onlyIn1) {
    Write-Host "`n只在文件1中的文件:"
    $onlyIn1 | ForEach-Object { Write-Host "  - $_" }
}

if ($onlyIn2) {
    Write-Host "`n只在文件2中的文件:"
    $onlyIn2 | ForEach-Object { Write-Host "  - $_" }
}

Write-Host "`n大小不同的内部文件:"
$hasDiff = $false
foreach ($entry in $zip1.Entries) {
    $match = $zip2.Entries | Where-Object { $_.Name -eq $entry.Name }
    if ($match -and $entry.Length -ne $match.Length) {
        Write-Host "  $($entry.Name): $($entry.Length) -> $($match.Length)"
        $hasDiff = $true
    }
}
if (-not $hasDiff) {
    Write-Host "  无差异"
}

$zip1.Dispose()
$zip2.Dispose()

Write-Host "`n=== 结论 ===" -ForegroundColor Green
if ($hash1.Hash -ne $hash2.Hash) {
    Write-Host "两个文件内容不同！"
    Write-Host "文件1来自豆包网站下载，带有互联网安全标识"
    Write-Host "文件2没有互联网安全标识，可能是本地编辑版本"
} else {
    Write-Host "两个文件内容完全相同"
    Write-Host "但文件2没有Zone.Identifier安全标识"
}
