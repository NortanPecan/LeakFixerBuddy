$ErrorActionPreference = 'Stop'

function Join-Codes {
  param([int[]]$Codes)
  return -join ($Codes | ForEach-Object { [char]$_ })
}

$patterns = @(
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

$files = git diff --cached --name-only --diff-filter=ACM | Where-Object {
  $_ -and (
    $_ -like 'src/*' -or
    $_ -like 'docs/*' -or
    $_ -eq 'CLAUDE.md'
  )
} | Where-Object {
  $_ -match '\.(ts|tsx|js|jsx|md)$'
}

if (-not $files) {
  Write-Output 'Encoding check passed (staged)'
  exit 0
}

$findings = New-Object System.Collections.Generic.List[string]

foreach ($file in $files) {
  $content = git show ":$file"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read staged file: $file"
  }

  $lines = $content -split "`r?`n"

  for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    foreach ($pattern in $patterns) {
      if ($line.Contains($pattern)) {
        $findings.Add(("{0}:{1}: {2}" -f $file, ($i + 1), $line.Trim()))
        break
      }
    }
  }
}

if ($findings.Count -gt 0) {
  Write-Error "Potential mojibake found in staged files:`n$($findings -join [Environment]::NewLine)"
  exit 1
}

Write-Output 'Encoding check passed (staged)'
