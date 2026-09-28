<#
.SYNOPSIS
Rebuilds config/repo_skills.json by scanning the shallow clones in repos/.

.DESCRIPTION
Walks every repos/*/ tree for SKILL.md files, reads the YAML frontmatter
(name + description), and collapses byte-identical duplicates into a single
entry with a path list. Vendored repos ship the same skill compiled once per
agent (impeccable, ui-ux-pro-max, hindsight), so raw counts badly overstate
how many distinct skills are actually available.

Run after adding or updating a repo under repos/.
#>
[CmdletBinding()]
param(
    [string]$TatoRoot = (Split-Path -Parent $PSScriptRoot)
)

$reposRoot = Join-Path $TatoRoot 'repos'
$manifest   = Join-Path $TatoRoot 'config\repos.json'
$outFile    = Join-Path $TatoRoot 'config\repo_skills.json'

if (-not (Test-Path -LiteralPath $reposRoot)) {
    throw "repos/ not found at $reposRoot. Clone the repos first (see config/repos.json)."
}

$repoMeta = @{}
if (Test-Path -LiteralPath $manifest) {
    $repoMeta = @{}
    (Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json).repos | ForEach-Object {
        $repoMeta[$_.dir] = $_
    }
}

function Get-SkillFrontmatter {
    param([string]$Path)

    # -Encoding UTF8 is required: SKILL.md files are BOM-less UTF-8, and without
    # it Windows PowerShell 5.1 decodes as ANSI and mangles em-dashes into "�?".
    $lines = @(Get-Content -LiteralPath $Path -TotalCount 60 -Encoding UTF8 -ErrorAction SilentlyContinue)
    if ($lines.Count -eq 0) { return $null }
    if ($lines[0].Trim() -ne '---') { return $null }

    $fields = @{}

    for ($i = 1; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line.Trim() -eq '---') { break }
        if ([string]::IsNullOrWhiteSpace($line)) { continue }

        # Only top-level keys (no leading indent) - we want name/description,
        # never anything nested under metadata:, agents:, etc.
        if ($line -notmatch '^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$') { continue }
        $key   = $Matches[1].ToLower()
        $value = $Matches[2].Trim()

        # Value continues on following indented lines. Covers all three forms:
        #   description: |            (block scalar)
        #   description: >-           (folded, chomped)
        #   description:              (bare key, scalar starts on the next line)
        if ($value -eq '' -or $value -match '^[|>][+-]?$') {
            $parts = [System.Collections.Generic.List[string]]::new()
            for ($j = $i + 1; $j -lt $lines.Count; $j++) {
                $next = $lines[$j]
                if ([string]::IsNullOrWhiteSpace($next)) { continue }
                if ($next -notmatch '^[ \t]') { break }   # dedented - block ended
                $parts.Add($next.Trim())
            }
            $joined = ($parts -join ' ').Trim() -replace '\s+', ' '
            $joined = $joined.Trim('"').Trim("'").Trim()
            if ($joined) { $fields[$key] = $joined }
            $i = $j - 1
            continue
        }

        if ($value) { $fields[$key] = ($value.Trim('"').Trim("'")) }
    }

    if (-not $fields.ContainsKey('name') -or -not $fields['name']) { return $null }
    return [pscustomobject]@{
        name        = $fields['name']
        description = if ($fields.ContainsKey('description')) { $fields['description'] } else { $null }
    }
}

# Canonical ranking: prefer the plainest, most authoritative install path.
#   score = 1000 * isExcluded  +  10 * dotPrefixedSegments  +  depth
# Dot-prefixed segments (.claude/, .cursor/, .gemini/, .rovodev/, ...) are
# packaging copies aimed at some other agent, so they always lose to the
# repo's own skills/<name>/SKILL.md. Test fixtures are not real skills at all.
$excludedSegments = @(
    'tests', 'test', '__tests__', 'testdata', 'fixtures', 'fixture', 'oracle',
    'examples', 'example', 'sample', 'samples', 'docs', 'doc', 'node_modules',
    'vendor', 'e2e', 'benchmark', 'benchmarks', 'coverage', 'dist', 'build'
)

function Get-CanonicalRank {
    param([string]$RelPath, [string]$Repo)

    $depth = 0
    $dotDirs = 0
    $excluded = $false
    $repoRootSkills = $false

    $segments = $RelPath.Split('/')
    for ($i = 0; $i -lt $segments.Count; $i++) {
        $s = $segments[$i]
        if ($i -eq 0) { continue }          # 'repos'
        if ($i -eq 1) { continue }          # <repo>
        $depth++
        if ($s.StartsWith('.')) { $dotDirs++ }
        if ($excludedSegments -contains $s.ToLower()) { $excluded = $true }
    }

    # repos/<repo>/skills/<name>/SKILL.md is the vendor's own layout
    if ($segments.Count -ge 4 -and $segments[2] -eq 'skills') { $repoRootSkills = $true }

    $score = (1000 * [int]$excluded) + (10 * $dotDirs) + $depth
    if ($repoRootSkills) { $score -= 5 }

    return [pscustomobject]@{ score = $score; depth = $depth; dotDirs = $dotDirs; excluded = $excluded }
}

$entries = @{}

$skillFiles = Get-ChildItem -LiteralPath $reposRoot -Recurse -Force -File -Filter 'SKILL.md' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike '*\.git\*' }

$skipped = 0
$excludedCount = 0

foreach ($file in $skillFiles) {
    $rel  = $file.FullName.Substring($TatoRoot.Length + 1).Replace('\', '/')
    $repo = $file.FullName.Substring($reposRoot.Length + 1).Split('\')[0]
    $fm   = Get-SkillFrontmatter -Path $file.FullName
    $rank = Get-CanonicalRank -RelPath $rel -Repo $repo

    if ($rank.excluded) { $excludedCount++; continue }
    if (-not $fm) { $skipped++; continue }

    # One logical skill = same repo + same frontmatter name. Vendored repos ship
    # the same skill once per target agent, so keying on name collapses the
    # packaging noise that a content hash would treat as distinct.
    $key = "$repo/$($fm.name)"

    if (-not $entries.ContainsKey($key)) {
        $entries[$key] = [pscustomobject]@{
            repo        = $repo
            name        = $fm.name
            description = $fm.description
            rank        = $rank
            canonical   = $rel
            hashes      = [System.Collections.Generic.HashSet[string]]::new()
            copies      = [System.Collections.Generic.List[string]]::new()
        }
    }

    $e = $entries[$key]
    $null = $e.hashes.Add((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash)
    $e.copies.Add($rel)

    if ($rank.score -lt $e.rank.score) {
        $e.rank      = $rank
        $e.canonical = $rel
    }
}

$skills = foreach ($e in $entries.Values) {
    $desc = $e.description
    if ($desc -and $desc.Length -gt 300) { $desc = $desc.Substring(0, 297).TrimEnd() + '...' }

    [pscustomobject][ordered]@{
        repo            = $e.repo
        name            = $e.name
        description     = $desc
        canonical_path  = $e.canonical
        copy_count      = $e.copies.Count
        content_variants = $e.hashes.Count
        also_at         = @($e.copies | Where-Object { $_ -ne $e.canonical })
    }
}

$byRepo = $skills | Group-Object -Property repo | Sort-Object Count -Descending | ForEach-Object {
    $group    = $_
    $repoName = $group.Name
    $repoFiles = @($skillFiles | Where-Object {
        $_.FullName.Substring($reposRoot.Length + 1).Split('\')[0] -eq $repoName
    })
    [pscustomobject][ordered]@{
        repo     = $repoName
        distinct = $group.Count
        files    = $repoFiles.Count
        url      = if ($repoMeta.ContainsKey($repoName)) { $repoMeta[$repoName].url } else { $null }
    }
}

$collapsed = ($skillFiles.Count - $excludedCount) - @($skills).Count

$payload = [ordered]@{
    _comment  = 'Auto-generated by scripts/index-repo-skills.ps1 - do not edit by hand. Distinct skills available in the vendored repos under repos/, one entry per repo+skill-name (per-agent packaging copies collapsed). The orchestrator treats this as its second-tier registry after config/skills.json.'
    generated_from = 'repos/'
    totals    = [ordered]@{
        skill_files       = $skillFiles.Count
        distinct          = @($skills).Count
        collapsed_copies  = ($skillFiles.Count - $excludedCount) - @($skills).Count
        excluded_paths    = $excludedCount
        no_frontmatter    = $skipped
        repos_with_skills = @($byRepo).Count
    }
    by_repo   = @($byRepo)
    skills    = @($skills | Sort-Object repo, name)
}

$json = $payload | ConvertTo-Json -Depth 6
# Write UTF-8 without a BOM (Set-Content -Encoding UTF8 emits one on PS 5.1,
# and a BOM breaks some strict JSON readers).
[System.IO.File]::WriteAllText($outFile, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Output "wrote $outFile"
Write-Output "  skill files : $($skillFiles.Count)"
Write-Output "  distinct    : $(@($skills).Count)  (collapsed $($collapsed) packaging copies, skipped $excludedCount test/fixture paths, $skipped without frontmatter)"
$byRepo | ForEach-Object { Write-Output ("  {0,-18} {1,4} skills / {2,4} files" -f $_.repo, $_.distinct, $_.files) }
