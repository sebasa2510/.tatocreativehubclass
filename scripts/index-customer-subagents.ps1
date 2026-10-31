<#
.SYNOPSIS
Rebuilds the customer parent's (CCO) sub_agents list from the customer/ folder.

.DESCRIPTION
Every skill file in customer/ with `role: subagent` is a route under the
customer parent. This script finds the customer parent (the frontmatter that
has `role: parent` AND declares a `parent:`), collects every subagent name in
the folder, and rewrites the parent's `sub_agents:` frontmatter block to match.

It keeps the current order and appends any newly added skill alphabetically, so
creating a skill in customer/ and running this script wires it under the CCO
automatically - no hand-editing the registry.

Run after creating or removing a skill in customer/:

    .\scripts\index-customer-subagents.ps1
#>
[CmdletBinding()]
param(
    [string]$TatoRoot = (Split-Path -Parent $PSScriptRoot)
)

$customerRoot = Join-Path $TatoRoot 'customer'

if (-not (Test-Path -LiteralPath $customerRoot)) {
    throw "customer/ not found at $customerRoot."
}

function Get-Frontmatter {
    param([string]$Path)

    # -Encoding UTF8 is required: the files are BOM-less UTF-8, and without it
    # Windows PowerShell 5.1 decodes as ANSI and mangles em-dashes.
    $lines = @(Get-Content -LiteralPath $Path -Encoding UTF8 -ErrorAction SilentlyContinue)
    if ($lines.Count -eq 0) { return $null }
    if ($lines[0].Trim() -ne '---') { return $null }

    $fm = @{ name = $null; role = $null; parent = $null; sub_agents = @() }
    $inSubAgents = $false

    for ($i = 1; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line.Trim() -eq '---') { break }

        if ($inSubAgents) {
            if ($line -match '^\s+-\s*(.+?)\s*$') {
                $fm['sub_agents'] += $Matches[1].Trim().Trim('"').Trim("'")
                continue
            }
            if ($line -notmatch '^\s') { $inSubAgents = $false }
        }

        if ($line -match '^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$') {
            $key = $Matches[1].ToLower()
            $val = $Matches[2].Trim().Trim('"').Trim("'")
            switch ($key) {
                'name'       { $fm['name'] = $val }
                'role'       { $fm['role'] = $val }
                'parent'     { $fm['parent'] = $val }
                'sub_agents' { $inSubAgents = $true }
            }
        }
    }

    return $fm
}

$files = @(Get-ChildItem -LiteralPath $customerRoot -File -Filter '*.md' -ErrorAction SilentlyContinue)

$meta = foreach ($f in $files) {
    $fm = Get-Frontmatter -Path $f.FullName
    if ($fm -and $fm['name']) {
        [pscustomobject]@{
            file       = $f
            name       = $fm['name']
            role       = $fm['role']
            parent     = $fm['parent']
            sub_agents = @($fm['sub_agents'])
        }
    }
}

# The customer parent is the only frontmatter with role: parent AND a parent:.
$parentEntry = @($meta | Where-Object { $_.role -eq 'parent' -and $_.parent })
if ($parentEntry.Count -ne 1) {
    throw ("Expected exactly one customer parent (role: parent + parent: ...), found {0}." -f $parentEntry.Count)
}
$parentEntry = $parentEntry[0]

# Sub-skills = every other file that declares role: subagent.
$discovered = @($meta |
    Where-Object { $_.name -ne $parentEntry.name -and $_.role -eq 'subagent' } |
    Select-Object -ExpandProperty name)

# Keep the current order, then append new skills alphabetically.
$kept  = @($parentEntry.sub_agents | Where-Object { $discovered -contains $_ })
$added = @($discovered | Where-Object { $kept -notcontains $_ } | Sort-Object)
$final = @($kept) + @($added)

# Rewrite the sub_agents block in the parent file.
$lines = @(Get-Content -LiteralPath $parentEntry.file.FullName -Encoding UTF8)
$out   = [System.Collections.Generic.List[string]]::new()
$written = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    if (-not $written -and $lines[$i] -match '^sub_agents:\s*$') {
        $out.Add('sub_agents:')
        foreach ($n in $final) { $out.Add("  - $n") }
        $written = $true
        # Skip the old list items that followed the key.
        while ($i + 1 -lt $lines.Count -and $lines[$i + 1] -match '^\s+-') { $i++ }
        continue
    }
    $out.Add($lines[$i])
}

if (-not $written) {
    throw "No 'sub_agents:' block found in $($parentEntry.file.FullName)."
}

# UTF-8 without a BOM (Set-Content -Encoding UTF8 emits one on PS 5.1).
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($parentEntry.file.FullName, $out, $utf8)

Write-Output "wrote $($parentEntry.file.FullName)"
Write-Output "  parent     : $($parentEntry.name)"
Write-Output "  sub-skills : $($final.Count)  ($($final -join ', '))"
if ($added.Count) { Write-Output "  added      : $($added -join ', ')" }
