$ErrorActionPreference = 'Stop'

function Join-Codes {
  param([int[]]$Codes)
  return -join ($Codes | ForEach-Object { [char]$_ })
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$encodingPatterns = @(
  (Join-Codes @(0x0420, 0x045F, 0x0420)),
  (Join-Codes @(0x0420, 0x201C, 0x0420)),
  (Join-Codes @(0x0420, 0x2014, 0x0420)),
  (Join-Codes @(0x0420, 0x00A6, 0x0420)),
  (Join-Codes @(0x0420, 0x00A4, 0x0420)),
  (Join-Codes @(0x0420, 0x045A, 0x0420)),
  (Join-Codes @(0x0420, 0x00A7, 0x0420)),
  (Join-Codes @(0x0420, 0x040E, 0x0420)),
  (Join-Codes @(0x0420, 0x045C, 0x0420)),
  (Join-Codes @(0x0421, 0x0402, 0x0420)),
  (Join-Codes @(0x0421, 0x0457)),
  (Join-Codes @(0x0421, 0x045B)),
  (Join-Codes @(0x0421, 0x201A)),
  (Join-Codes @(0x0421, 0x0453)),
  (Join-Codes @(0x0421, 0x2021)),
  (Join-Codes @(0x0440, 0x045F)),
  (Join-Codes @(0x0432, 0x20AC)),
  (Join-Codes @(0x0432, 0x045C)),
  (Join-Codes @(0x043F, 0x0451, 0x040F))
)

function Get-UpstreamRange {
  # Wrap in try/catch: $ErrorActionPreference='Stop' would otherwise throw
  # NativeCommandError on a new branch that has no upstream yet.
  $upstream = try {
    $ea = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $result = git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" 2>$null
    $ErrorActionPreference = $ea
    $result
  } catch { $null }
  if ($LASTEXITCODE -eq 0 -and $upstream) {
    return "$($upstream.Trim())..HEAD"
  }

  return $null
}

function Get-ChangedFilesForPush {
  $range = Get-UpstreamRange

  if ($range) {
    return @(git diff --name-only --diff-filter=ACM $range)
  }

  $defaultBase = try {
    $ea = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $result = git rev-parse --verify "origin/main" 2>$null
    $ErrorActionPreference = $ea
    $result
  } catch { $null }

  if ($LASTEXITCODE -eq 0 -and $defaultBase) {
    $mergeBase = git merge-base HEAD origin/main
    if ($LASTEXITCODE -eq 0 -and $mergeBase) {
      return @(git diff --name-only --diff-filter=ACM "$($mergeBase.Trim())..HEAD")
    }
  }

  return @(git ls-files)
}

function Is-TextFile([string]$file) {
  return $file -match '\.(ts|tsx|js|jsx|md)$'
}

function Is-LintFile([string]$file) {
  return $file -match '\.(ts|tsx|js|jsx)$'
}

$changedFiles = Get-ChangedFilesForPush | Where-Object { $_ } | Sort-Object -Unique

if (-not $changedFiles) {
  Write-Output 'Pre-push checks passed (no changed files)'
  exit 0
}

$textFiles = @($changedFiles | Where-Object { Is-TextFile $_ })
$lintFiles = @($changedFiles | Where-Object { Is-LintFile $_ -and (Test-Path $_) })

if ($textFiles.Count -gt 0) {
  $encodingFindings = New-Object System.Collections.Generic.List[string]

  foreach ($file in $textFiles) {
    $content = git show "HEAD:$file"
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to read committed content for $file"
    }

    $lines = $content -split "`r?`n"
    for ($i = 0; $i -lt $lines.Length; $i++) {
      $line = $lines[$i]
      foreach ($pattern in $encodingPatterns) {
        if ($line.Contains($pattern)) {
          $encodingFindings.Add(("{0}:{1}: {2}" -f $file, ($i + 1), $line.Trim()))
          break
        }
      }
    }
  }

  if ($encodingFindings.Count -gt 0) {
    Write-Error "Potential mojibake found in pushed files:`n$($encodingFindings -join [Environment]::NewLine)"
    exit 1
  }
}

if ($lintFiles.Count -gt 0) {
  $eslintCmd = Join-Path $repoRoot 'node_modules\.bin\eslint.exe'
  if (-not (Test-Path $eslintCmd)) {
    $eslintCmd = Join-Path $repoRoot 'node_modules\.bin\eslint.cmd'
  }
  if (-not (Test-Path $eslintCmd)) {
    throw "eslint binary not found in node_modules/.bin"
  }

  Write-Output "Running eslint on changed files..."
  & $eslintCmd @lintFiles
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Write-Output 'Pre-push checks passed'
