# deploy-netlify.ps1 — finish the Netlify deploy from an ELEVATED shell.
#
# WHY THIS EXISTS
# `netlify deploy --build` needs to create a symlink while packaging the Next.js
# server handler. Windows blocks symlink creation for a non-elevated process.
# This script self-elevates, runs the deploy, then reports the live status of
# the lead-agent routes.
#
# USAGE (normal PowerShell is fine — it will prompt to elevate):
#   powershell -ExecutionPolicy Bypass -File scripts\deploy-netlify.ps1

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal] `
  [Security.Principal.WindowsIdentity]::GetCurrent() `
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Elevation required (Windows blocks symlinks otherwise). Re-launching as Administrator..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', "`"$PSCommandPath`""
    )
    exit
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> Generating Prisma client" -ForegroundColor Cyan
npx prisma generate

Write-Host "==> Building and deploying to Netlify" -ForegroundColor Cyan
netlify deploy --build --prod --message "Lead agent live: rubric, monogram, adaptive nav"

Write-Host "`n==> Verifying live routes" -ForegroundColor Cyan
$checks = @(
    @{ Path = '/';             Want = 200; Label = 'marketing site' },
    @{ Path = '/dashboard';    Want = 200; Label = 'portal' },
    @{ Path = '/icon';         Want = 200; Label = 'brand icon' },
    @{ Path = '/leads';        Want = 200; Label = 'LEAD AGENT' },
    @{ Path = '/api/leads';    Want = 200; Label = 'lead API' }
)

$failed = $false
foreach ($c in $checks) {
    $url = "https://tatoiq.netlify.app$($c.Path)"
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
        $ok = $r.StatusCode -eq $c.Want
        $color = if ($ok) { 'Green' } else { 'Red' }
        Write-Host ("  {0,-14} {1,-28} -> {2}" -f $c.Label, $c.Path, $r.StatusCode) -ForegroundColor $color
        if (-not $ok) { $failed = $true }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host ("  {0,-14} {1,-28} -> ERR {2}" -f $c.Label, $c.Path, $code) -ForegroundColor Red
        $failed = $true
    }
}

if ($failed) {
    Write-Host "`nSome routes are not live. A 404 on /leads means the static export" -ForegroundColor Yellow
    Write-Host "was deployed instead of the server build - check netlify.toml." -ForegroundColor Yellow
    Write-Host "Press any key to close..."; $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

Write-Host "`nLead agent is live at https://tatoiq.netlify.app/leads" -ForegroundColor Green
Write-Host "Press any key to close..."; $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
