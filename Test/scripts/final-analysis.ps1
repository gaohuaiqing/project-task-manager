# 文件上传问题最终分析
$ErrorActionPreference = "Stop"

# 获取文件
$file1 = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "*2026-03-07-v1.1*.pptx" | Select-Object -First 1
$folder = Get-ChildItem "E:\WorkDocuments" -Directory | Where-Object { $_.Name -like "*部门*" } | Select-Object -First 1
$year = Get-ChildItem $folder.FullName -Directory | Where-Object { $_.Name -like "*2026*" } | Select-Object -First 1
$report = Get-ChildItem $year.FullName -Directory | Where-Object { $_.Name -like "*管理汇报*" } | Select-Object -First 1
$file2 = Get-ChildItem $report.FullName -Filter "*2026-03-07-v1.1*.pptx" | Select-Object -First 1

Write-Host "=== 文件上传问题分析 ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[文件1 - 可以上传]" -ForegroundColor Green
Write-Host "路径: $($file1.FullName)"
Write-Host "大小: $($file1.Length) bytes"
$streams1 = Get-Item $file1.FullName -Stream *
Write-Host "数据流数量: $($streams1.Count)"
foreach ($s in $streams1) {
    Write-Host "  - $($s.Stream): $($s.Length) bytes"
}

Write-Host ""
Write-Host "[文件2 - 不能上传]" -ForegroundColor Red
Write-Host "路径: $($file2.FullName)"
Write-Host "大小: $($file2.Length) bytes"
$streams2 = Get-Item $file2.FullName -Stream *
Write-Host "数据流数量: $($streams2.Count)"
foreach ($s in $streams2) {
    Write-Host "  - $($s.Stream): $($s.Length) bytes"
}

Write-Host ""
Write-Host "[关键差异分析]" -ForegroundColor Yellow

# 检查Zone.Identifier
$hasZone1 = $streams1 | Where-Object { $_.Stream -like "*Zone.Identifier*" }
$hasZone2 = $streams2 | Where-Object { $_.Stream -like "*Zone.Identifier*" }

if ($hasZone1) {
    Write-Host "文件1: 有 Zone.Identifier (来自互联网)" -ForegroundColor Green
} else {
    Write-Host "文件1: 无 Zone.Identifier" -ForegroundColor Red
}

if ($hasZone2) {
    Write-Host "文件2: 有 Zone.Identifier (来自互联网)" -ForegroundColor Green
} else {
    Write-Host "文件2: 无 Zone.Identifier (本地文件)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[结论]" -ForegroundColor Cyan
if ($hasZone1 -and !$hasZone2) {
    Write-Host "根本原因: Zone.Identifier 差异" -ForegroundColor Green
    Write-Host ""
    Write-Host "文件1有互联网来源标记，即使修改内容也能上传" -ForegroundColor White
    Write-Host "文件2没有互联网来源标记，AI网站拒绝上传" -ForegroundColor White
    Write-Host ""
    Write-Host "AI网站检查的是文件的来源标识，不是内容" -ForegroundColor Yellow
} else {
    Write-Host "Need further analysis" -ForegroundColor Yellow
}
