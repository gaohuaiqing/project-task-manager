$ErrorActionPreference = "Stop"

# 文件路径
$path1 = "C:\Users\50223183\Downloads\2026年部门管理思路-高怀庆-2026-03-07-v1.1.pptx"
$path2 = "E:\WorkDocuments\部门管理\2026年\管理汇报\2026年部门管理思路-高怀庆-2026-03-07-v1.1.pptx"

Write-Host "========================================"
Write-Host "NTFS备选数据流对比分析"
Write-Host "========================================"
Write-Host ""

Write-Host "[文件1 - Downloads - 可上传]" -ForegroundColor Green
Write-Host "路径: $path1"
$streams1 = Get-Item -LiteralPath $path1 -Stream *
Write-Host "数据流总数: $($streams1.Count)"
Write-Host ""
foreach ($s in $streams1) {
    Write-Host "  [$($s.Stream)] - $($s.Length) bytes"
}

Write-Host ""
Write-Host "[文件2 - WorkDocuments - 不可上传]" -ForegroundColor Red
Write-Host "路径: $path2"
$streams2 = Get-Item -LiteralPath $path2 -Stream *
Write-Host "数据流总数: $($streams2.Count)"
Write-Host ""
foreach ($s in $streams2) {
    Write-Host "  [$($s.Stream)] - $($s.Length) bytes"
}

Write-Host ""
Write-Host "========================================"
Write-Host "差异分析"
Write-Host "========================================"

$names1 = $streams1 | ForEach-Object { $_.Stream }
$names2 = $streams2 | ForEach-Object { $_.Stream }

$onlyIn1 = $names1 | Where-Object { $_ -notin $names2 }
$onlyIn2 = $names2 | Where-Object { $_ -notin $names1 }

Write-Host ""
if ($onlyIn1) {
    Write-Host "只在文件1中的数据流:" -ForegroundColor Yellow
    $onlyIn1 | ForEach-Object { Write-Host "  - $_" }
}

Write-Host ""
if ($onlyIn2) {
    Write-Host "只在文件2中的数据流:" -ForegroundColor Yellow
    $onlyIn2 | ForEach-Object { Write-Host "  - $_" }
}

Write-Host ""
if (-not $onlyIn1 -and -not $onlyIn2) {
    Write-Host "数据流完全相同" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================"
Write-Host "结论"
Write-Host "========================================"
if ($onlyIn1) {
    Write-Host "关键差异: 文件1有额外的NTFS数据流标记" -ForegroundColor Yellow
    Write-Host "这可能是AI网站检查的安全标记" -ForegroundColor Yellow
} else {
    Write-Host "Need further analysis" -ForegroundColor Yellow
}
