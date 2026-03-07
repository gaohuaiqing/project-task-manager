# 检查备选数据流
$path1 = "C:\Users\50223183\Downloads\2026年部门管理思路-高怀庆-2026-03-07-v1.1.pptx"
$path2 = "E:\WorkDocuments\部门管理\2026年\管理汇报\2026年部门管理思路-高怀庆-2026-03-07-v1.1.pptx"

Write-Host "=== File 1 (Downloads) ==="
$item1 = Get-Item -LiteralPath $path1
$streams1 = $item1.GetAlternateDataStreams()
Write-Host "Alternate Data Streams count: $($streams1.Count)"
foreach ($s in $streams1) {
    Write-Host "  Stream: [$($s.Stream)] Size: $($s.Length)"
}

Write-Host "`n=== File 2 (WorkDocuments) ==="
$item2 = Get-Item -LiteralPath $path2
$streams2 = $item2.GetAlternateDataStreams()
Write-Host "Alternate Data Streams count: $($streams2.Count)"
foreach ($s in $streams2) {
    Write-Host "  Stream: [$($s.Stream)] Size: $($s.Length)"
}

Write-Host "`n=== Comparison ==="
if ($streams1.Count -gt $streams2.Count) {
    Write-Host "File 1 has more streams"
} elseif ($streams2.Count -gt $streams1.Count) {
    Write-Host "File 2 has more streams"
} else {
    Write-Host "Both files have the same number of streams"
}

# 检查Zone.Identifier
$zone1 = "$path1`:$($streams1[0].Stream)"
$zone2 = "$path2`:$($streams2[0].Stream)"

Write-Host "`n=== Zone.Identifier Check ==="
try {
    $content1 = Get-Content -Path "$path1`:Zone.Identifier" -ErrorAction Stop
    Write-Host "File 1 has Zone.Identifier:"
    Write-Host $content1
} catch {
    Write-Host "File 1 does NOT have Zone.Identifier"
}

try {
    $content2 = Get-Content -Path "$path2`:Zone.Identifier" -ErrorAction Stop
    Write-Host "File 2 has Zone.Identifier:"
    Write-Host $content2
} catch {
    Write-Host "File 2 does NOT have Zone.Identifier"
}
