# 分析文件上传问题的根本原因
$ErrorActionPreference = "Stop"

# 获取文件
$file1 = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "*2026-03-07-v1.1*.pptx" | Select-Object -First 1

$folder = Get-ChildItem "E:\WorkDocuments" -Directory | Where-Object { $_.Name -like "*部门*" } | Select-Object -First 1
$year = Get-ChildItem $folder.FullName -Directory | Where-Object { $_.Name -like "*2026*" } | Select-Object -First 1
$report = Get-ChildItem $year.FullName -Directory | Where-Object { $_.Name -like "*管理汇报*" } | Select-Object -First 1
$file2 = Get-ChildItem $report.FullName -Filter "*2026-03-07-v1.1*.pptx" | Select-Object -First 1

Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  文件上传问题深度分析" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "【关键观察】" -ForegroundColor Yellow
Write-Host "文件1（Downloads）即使修改内容也能上传成功" -ForegroundColor White
Write-Host "这说明问题不在文件内容，而在文件属性或标记！" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. 文件基本信息对比" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "文件1（可上传）:" -ForegroundColor Green
Write-Host "  路径: $($file1.FullName)"
Write-Host "  大小: $($file1.Length) 字节"
Write-Host "  修改时间: $($file1.LastWriteTime)"
Write-Host "  创建时间: $($file1.CreationTime)"

Write-Host "`n文件2（不可上传）:" -ForegroundColor Red
Write-Host "  路径: $($file2.FullName)"
Write-Host "  大小: $($file2.Length) 字节"
Write-Host "  修改时间: $($file2.LastWriteTime)"
Write-Host "  创建时间: $($file2.CreationTime)"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "2. Zone.Identifier 安全标识检查（关键）" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$zoneId1 = "$($file1.FullName):Zone.Identifier"
$zoneId2 = "$($file2.FullName):Zone.Identifier"

Write-Host "文件1 Zone.Identifier:" -ForegroundColor Green
if (Test-Path $zoneId1) {
    Write-Host "  ✅ 存在 - 标记为来自互联网" -ForegroundColor Green
    $zoneContent = Get-Content $zoneId1
    Write-Host "  内容:"
    $zoneContent | ForEach-Object { Write-Host "    $_" }
} else {
    Write-Host "  ❌ 不存在" -ForegroundColor Red
}

Write-Host "`n文件2 Zone.Identifier:" -ForegroundColor Red
if (Test-Path $zoneId2) {
    Write-Host "  ✅ 存在 - 标记为来自互联网" -ForegroundColor Green
    $zoneContent = Get-Content $zoneId2
    Write-Host "  内容:"
    $zoneContent | ForEach-Object { Write-Host "    $_" }
} else {
    Write-Host "  ❌ 不存在 - 未标记为来自互联网" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "3. NTFS 备选数据流（ADS）完整检查" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "文件1的所有数据流:" -ForegroundColor Green
$streams1 = Get-Item $file1.FullName -Stream *
$streams1 | ForEach-Object {
    $streamName = $_.Stream
    $streamSize = $_.Length
    Write-Host "  Stream: $streamName Size: $streamSize bytes"
}

Write-Host "`n文件2的所有数据流:" -ForegroundColor Red
$streams2 = Get-Item $file2.FullName -Stream *
$streams2 | ForEach-Object {
    $streamName = $_.Stream
    $streamSize = $_.Length
    Write-Host "  Stream: $streamName Size: $streamSize bytes"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "4. 文件属性详细对比" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "文件1属性:" -ForegroundColor Green
Write-Host "  只读: $($file1.IsReadOnly)"
Write-Host "  归档: $($file1.Attributes -band [System.IO.FileAttributes]::Archive)"
Write-Host "  压缩: $($file1.Attributes -band [System.IO.FileAttributes]::Compressed)"
Write-Host "  加密: $($file1.Attributes -band [System.IO.FileAttributes]::Encrypted)"
Write-Host "  脱机: $($file1.Attributes -band [System.IO.FileAttributes]::Offline)"

Write-Host "`n文件2属性:" -ForegroundColor Red
Write-Host "  只读: $($file2.IsReadOnly)"
Write-Host "  归档: $($file2.Attributes -band [System.IO.FileAttributes]::Archive)"
Write-Host "  压缩: $($file2.Attributes -band [System.IO.FileAttributes]::Compressed)"
Write-Host "  加密: $($file2.Attributes -band [System.IO.FileAttributes]::Encrypted)"
Write-Host "  脱机: $($file2.Attributes -band [System.IO.FileAttributes]::Offline)"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "5. MD5 哈希值对比（验证内容差异）" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$hash1 = Get-FileHash $file1.FullName -Algorithm MD5
$hash2 = Get-FileHash $file2.FullName -Algorithm MD5

Write-Host "文件1 MD5: $($hash1.Hash)" -ForegroundColor Green
Write-Host "文件2 MD5: $($hash2.Hash)" -ForegroundColor Red
Write-Host "哈希相同: $($hash1.Hash -eq $hash2.Hash)"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "【最终结论】" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$hasZone1 = Test-Path $zoneId1
$hasZone2 = Test-Path $zoneId2

if ($hasZone1 -and !$hasZone2) {
    Write-Host "✅ 找到根本原因！" -ForegroundColor Green
    Write-Host ""
    Write-Host "文件1可以上传的原因:" -ForegroundColor Green
    Write-Host "  ✓ 有 Zone.Identifier 标记" -ForegroundColor Green
    Write-Host "  ✓ 系统识别为来自互联网的文件" -ForegroundColor Green
    Write-Host "  ✓ 即使修改内容，标记依然存在" -ForegroundColor Green
    Write-Host ""
    Write-Host "文件2不能上传的原因:" -ForegroundColor Red
    Write-Host "  ✗ 没有 Zone.Identifier 标记" -ForegroundColor Red
    Write-Host "  ✗ 系统认为可能是本地创建的文件" -ForegroundColor Red
    Write-Host "  ✗ AI网站可能对没有来源标记的文件有限制" -ForegroundColor Red
    Write-Host ""
    Write-Host "【解决方案】" -ForegroundColor Yellow
    Write-Host "1. 使用文件1（Downloads中的文件）" -ForegroundColor White
    Write-Host "2. 或者给文件2添加Zone.Identifier标记" -ForegroundColor White
    Write-Host "3. 或者将文件2重新上传到豆包，然后下载" -ForegroundColor White
} else {
    Write-Host "需要进一步分析..." -ForegroundColor Yellow
}

Write-Host ""
