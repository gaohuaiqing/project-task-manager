# 分析两个PPTX文件的差异

Add-Type -AssemblyName System.IO.Compression.FileSystem

$file1 = "C:\Users\50223183\Downloads\2026年部门管理思路-高怀庆-2026-03-07-v1.1.pptx"
$file2 = "E:\WorkDocuments\部门管理\2026年\管理汇报\2026年部门管理思路-高怀庆-2026-03-07-v1.1.pptx"

Write-Host "=== 基本信息对比 ===" -ForegroundColor Green
Write-Host "文件1大小: $(Get-Item $file1).Length 字节"
Write-Host "文件2大小: $(Get-Item $file2).Length 字节"
Write-Host "大小差异: $((Get-Item $file2).Length - (Get-Item $file1).Length) 字节"

Write-Host "`n=== MD5哈希对比 ===" -ForegroundColor Green
$hash1 = Get-FileHash $file1 -Algorithm MD5
$hash2 = Get-FileHash $file2 -Algorithm MD5
Write-Host "文件1: $($hash1.Hash)"
Write-Host "文件2: $($hash2.Hash)"
Write-Host "哈希相同: $($hash1.Hash -eq $hash2.Hash)"

# 打开ZIP文件
$zip1 = [System.IO.Compression.ZipFile]::OpenRead($file1)
$zip2 = [System.IO.Compression.ZipFile]::OpenRead($file2)

Write-Host "`n=== 内部文件数量对比 ===" -ForegroundColor Green
Write-Host "文件1内部文件数: $($zip1.Entries.Count)"
Write-Host "文件2内部文件数: $($zip2.Entries.Count)"

Write-Host "`n=== 文件1内部文件列表 ===" -ForegroundColor Green
$zip1.Entries | Sort-Object Name | ForEach-Object {
    Write-Host "$($_.Name) - $($_.Length) 字节"
}

Write-Host "`n=== 文件2内部文件列表 ===" -ForegroundColor Green
$zip2.Entries | Sort-Object Name | ForEach-Object {
    Write-Host "$($_.Name) - $($_.Length) 字节"
}

Write-Host "`n=== 文件差异分析 ===" -ForegroundColor Green
$entries1 = $zip1.Entries | Sort-Object Name
$entries2 = $zip2.Entries | Sort-Object Name

$files1 = @($entries1 | ForEach-Object { $_.Name })
$files2 = @($entries2 | ForEach-Object { $_.Name })

# 查找只在文件1中存在的文件
$onlyIn1 = $files1 | Where-Object { $_ -notin $files2 }
if ($onlyIn1) {
    Write-Host "只在文件1中存在的文件:" -ForegroundColor Yellow
    $onlyIn1 | ForEach-Object { Write-Host "  - $_" }
}

# 查找只在文件2中存在的文件
$onlyIn2 = $files2 | Where-Object { $_ -notin $files1 }
if ($onlyIn2) {
    Write-Host "只在文件2中存在的文件:" -ForegroundColor Yellow
    $onlyIn2 | ForEach-Object { Write-Host "  - $_" }
}

# 查找大小不同的文件
Write-Host "`n大小不同的文件:" -ForegroundColor Yellow
foreach ($entry in $entries1) {
    $match = $entries2 | Where-Object { $_.Name -eq $entry.Name }
    if ($match -and $entry.Length -ne $match.Length) {
        Write-Host "  $($entry.Name): 文件1=$($entry.Length) 字节, 文件2=$($match.Length) 字节, 差异=$($match.Length - $entry.Length) 字节"
    }
}

$zip1.Dispose()
$zip2.Dispose()

Write-Host "`n=== Zone.Identifier检查 ===" -ForegroundColor Green
$zoneId1 = "$file1:Zone.Identifier"
$zoneId2 = "$file2:Zone.Identifier"

if (Test-Path $zoneId1) {
    Write-Host "文件1有Zone.Identifier" -ForegroundColor Yellow
    Get-Content $zoneId1
} else {
    Write-Host "文件1没有Zone.Identifier"
}

if (Test-Path $zoneId2) {
    Write-Host "文件2有Zone.Identifier" -ForegroundColor Yellow
    Get-Content $zoneId2
} else {
    Write-Host "文件2没有Zone.Identifier"
}
