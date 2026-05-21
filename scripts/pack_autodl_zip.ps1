# Pack this repo as ai-toolkit-gl.zip for AutoDL side-by-side deploy (does not replace ~/ai-toolkit).
# Usage (PowerShell, from repo root):
#   .\scripts\pack_autodl_zip.ps1
# Output: <repo-root>\ai-toolkit-gl.zip  (top folder inside zip: ai-toolkit-gl/)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ZipName = "ai-toolkit-gl.zip"
$StagingName = "ai-toolkit-gl"
$ZipPath = Join-Path $RepoRoot $ZipName
$StagingRoot = Join-Path $env:TEMP ("aitk-pack-" + [guid]::NewGuid().ToString("n"))
$StagingDir = Join-Path $StagingRoot $StagingName

# Always skip these directory names at any depth
$ExcludeDirNamesAnywhere = @(
    "node_modules", ".next", ".git", "__pycache__", "venv", "venv-mine",
    "ai-toolkit-reference", ".cursor", ".idea", "terminals"
)
# Skip only at repo root (do NOT skip ui/src/app/api/datasets — API routes live there)
$ExcludeDirNamesRootOnly = @("output", "model", "models", "datasets", "data")
$ExcludeFilePatterns = @("*.pyc", "*.pyo", "Thumbs.db", ".DS_Store", "ai-toolkit-gl.zip", "*.tar.gz", "*.zip")

Write-Host "Repo: $RepoRoot"
Write-Host "Staging: $StagingDir"
Write-Host "Output: $ZipPath"

if (Test-Path $StagingRoot) { Remove-Item $StagingRoot -Recurse -Force }
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

function Should-SkipDir([string]$Name, [string]$RelPath) {
    if ($ExcludeDirNamesAnywhere -contains $Name) { return $true }
    if ($ExcludeDirNamesRootOnly -contains $Name -and ($RelPath -eq $Name)) { return $true }
    return $false
}

function Copy-ProjectTree([string]$Source, [string]$Dest, [string]$RelPath = "") {
    Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
        if ($_.Name -eq $StagingName -and $_.PSIsContainer) { return }
        if ($_.Name -eq $ZipName) { return }
        $childRel = if ($RelPath) { "$RelPath/$($_.Name)" } else { $_.Name }
        if ($_.PSIsContainer) {
            if (Should-SkipDir $_.Name $childRel) {
                Write-Host "  skip dir: $childRel"
                return
            }
            $targetDir = Join-Path $Dest $_.Name
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            Copy-ProjectTree $_.FullName $targetDir $childRel
        } else {
            $skip = $false
            foreach ($pat in $ExcludeFilePatterns) {
                if ($_.Name -like $pat) { $skip = $true; break }
            }
            if ($skip) { return }
            $destPath = Join-Path $Dest $_.Name
            if ($_.Extension -eq ".sh") {
                # Linux bash rejects CRLF from Windows (set: pipefail: invalid option)
                $text = [IO.File]::ReadAllText($_.FullName) -replace "`r`n", "`n" -replace "`r", "`n"
                [IO.File]::WriteAllText($destPath, $text, [Text.UTF8Encoding]::new($false))
            } else {
                Copy-Item -LiteralPath $_.FullName -Destination $destPath -Force
            }
        }
    }
}

Write-Host "Copying files..."
Copy-ProjectTree $RepoRoot $StagingDir

$listRoute = Join-Path $StagingDir "ui\src\app\api\datasets\list\route.ts"
if (-not (Test-Path $listRoute)) {
    Write-Error "Pack verify failed: missing $listRoute (api/datasets routes must be in zip)"
}
Write-Host "Pack verify OK: api/datasets/list/route.ts"

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path $StagingDir -DestinationPath $ZipPath -CompressionLevel Optimal
Remove-Item $StagingRoot -Recurse -Force

$sizeMb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "Done: $ZipPath ($sizeMb MB)"
Write-Host "Upload to AutoDL (Jupyter / SCP), then ONE command:"
Write-Host "  unzip -o ~/ai-toolkit-gl.zip -d ~"
Write-Host "  bash ~/ai-toolkit-gl/scripts/autodl-deploy.sh"
Write-Host "Uses conda env 'ai-toolkit', UI port 6008, crontab autostart."
