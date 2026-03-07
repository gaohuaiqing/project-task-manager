# DLP标记分析 - 关键发现
$ErrorActionPreference = "Stop"

# 获取文件
$file1 = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "*2026-03-07-v1.1*.pptx" | Select-Object -First 1
$folder = Get-ChildItem "E:\WorkDocuments" -Directory | Where-Object { $_.Name -like "*部门*" } | Select-Object -First 1
$year = Get-ChildItem $folder.FullName -Directory | Where-Object { $_.Name -like "*2026*" } | Select-Object -First 1
$report = Get-ChildItem $year.FullName -Directory | Where-Object { $_.Name -like "*管理汇报*" } | Select-Object -First 1
$file2 = Get-ChildItem $report.FullName -Filter "*2026-03-07-v1.1*.pptx" | Select-Object -First 1

Write-Host "=== 关键发现: DLP标记分析 ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[文件1 - Downloads - 可以上传]" -ForegroundColor Green
Write-Host "完整路径: $($file1.FullName)"
Write-Host "文件大小: $($file1.Length) bytes"

$streams1 = Get-Item $file1.FullName -Stream *
Write-Host "数据流数量: $($streams1.Count)"
foreach ($s in $streams1) {
    Write-Host "  Stream: [$($s.Stream)] Size: $($s.Length) bytes"
    if ($s.Stream -ne ":\$DATA") {
        Write-Host "    -> 非主数据流！这可能是关键标记"
    }
}

Write-Host ""
Write-Host "[文件2 - WorkDocuments - 不能上传]" -ForegroundColor Red
Write-Host "完整路径: $($file2.FullName)"
Write-Host "文件大小: $($file2.Length) bytes"

$streams2 = Get-Item $file2.FullName -Stream *
Write-Host "数据流数量: $($streams2.Count)"
foreach ($s in $streams2) {
    Write-Host "  Stream: [$($s.Stream)] Size: $($s.Length) bytes"
    if ($s.Stream -ne ":\$DATA") {
        Write-Host "    -> 非主数据流！这可能是关键标记"
    }
}

Write-Host ""
Write-Host "[关键发现]" -ForegroundColor Yellow

$hasDlp1 = $streams1 | Where-Object { $_.Stream -like "*dlp*" }
$hasDlp2 = $streams2 | Where-Object { $_.Stream -like "*dlp*" }

Write-Host "文件1的DLP相关标记: " -NoNewline
if ($hasDlp1) {
    Write-Host "存在 ($($hasDlp1.Stream))" -ForegroundColor Green
} else {
    Write-Host "不存在" -ForegroundColor Red
}

Write-Host "文件2的DLP相关标记: " -NoNewline
if ($hasDlp2) {
    Write-Host "存在 ($($hasDlp2.Stream))" -ForegroundColor Green
} else {
    Write-Host "不存在" -ForegroundColor Red
}

Write-Host ""
Write-Host "[Analysis Conclusion]" -ForegroundColor Cyan
Write-Host "dlpfac = Data Loss Prevention FACility?" -ForegroundColor White
Write-Host "This may be a marker from Windows Defender or other security software" -ForegroundColor White
Write-Host "AI websites may check this marker to verify file safety" -ForegroundColor White
