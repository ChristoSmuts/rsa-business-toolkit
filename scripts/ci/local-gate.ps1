# Runs the same steps as .github/workflows/ci.yml, in the same order, on Windows PowerShell 5.1 or later.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/ci/local-gate.ps1 [-Fast]
param([switch]$Fast)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\..')

if (-not $env:BASE_PATH) { $env:BASE_PATH = '/business-toolkit/' }
if (-not $env:SITE_URL) { $env:SITE_URL = 'https://example.github.io' }

$pkg = Get-Content -Raw -Path 'package.json' | ConvertFrom-Json
$scripts = $pkg.scripts.PSObject.Properties.Name

function Invoke-Step([string]$Label, [scriptblock]$Block) {
  Write-Host ''
  Write-Host "==> $Label"
  & $Block
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Step failed: $Label (exit $LASTEXITCODE)"
    exit $LASTEXITCODE
  }
}

function Invoke-IfPresent([string]$Name) {
  if ($scripts -contains $Name) {
    Invoke-Step "pnpm $Name" { pnpm $Name }
  } else {
    Write-Host ''
    Write-Host "==> skip $Name (script not defined yet)"
  }
}

Invoke-Step 'pnpm install --frozen-lockfile' { pnpm install --frozen-lockfile }

foreach ($name in @('lint', 'typecheck', 'test', 'content:drift', 'test:content', 'content:fidelity')) {
  Invoke-IfPresent $name
}

if ($Fast) {
  Write-Host ''
  Write-Host '==> fast gate passed'
  exit 0
}

foreach ($name in @('build', 'test:e2e', 'test:a11y')) {
  Invoke-IfPresent $name
}

$dirty = git status --porcelain
if ($dirty) {
  git status --short
  Write-Error 'Working tree changed during the gate. Commit generated files or fix the generator.'
  exit 1
}

Write-Host ''
Write-Host '==> full gate passed'
