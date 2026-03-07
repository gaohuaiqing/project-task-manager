# 使用dir /r检查备选数据流
$path1 = "C:\Users\50223183\Downloads"
$file1 = "2026年部门管理思路-高怀庆-2026-03-07-v1.1.pptx"

$path2 = "E:\WorkDocuments\部门管理\2026年\管理汇报"
$file2 = "2026年部门管理思路-高怀庆-2026-03-07-v1.1.pptx"

Write-Host "=== Checking File 1 (Downloads) ===" -ForegroundColor Green
Push-Location $path1
cmd /c "dir /r `"$file1`""
Pop-Location

Write-Host "`n=== Checking File 2 (WorkDocuments) ===" -ForegroundColor Red
Push-Location $path2
cmd /c "dir /r `"$file2`""
Pop-Location

Write-Host "`n=== Checking Zone.Identifier directly ===" -ForegroundColor Yellow
try {
    $zone1 = "C:\Users\50223183\Downloads\2026年部门管理思路-高怀庆-2026-03-07-v1.1.pptx`":Zone.Identifier"
    if (Test-Path $zone1) {
        Write-Host "File 1 HAS Zone.Identifier" -ForegroundColor Green
        Get-Content $zone1
    } else {
        Write-Host "File 1 does NOT have Zone.Identifier" -ForegroundColor Red
    }
} catch {
    Write-Host "File 1 Zone.Identifier check failed: $_" -ForegroundColor Red
}

try {
    $zone2 = "E:\WorkDocuments\部门管理\2026年\管理汇报\2026年部门管理思路-高怀庆-2026-03-07-v1.1.pptx`":Zone.Identifier"
    if (Test-Path $zone2) {
        Write-Host "`nFile 2 HAS Zone.Identifier" -ForegroundColor Green
        Get-Content $zone2
    } else {
        Write-Host "`nFile 2 does NOT have Zone.Identifier" -ForegroundColor Red
    }
} catch {
    Write-Host "File 2 Zone.Identifier check failed: $_" -ForegroundColor Red
}
