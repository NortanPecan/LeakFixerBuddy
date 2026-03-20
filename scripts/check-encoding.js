const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const ROOT = process.cwd()
const SRC_DIR = path.join(ROOT, 'src')
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md'])
const SUSPICIOUS_MARKERS = [
  'РџР',
  'Р“Р',
  'Р—Р',
  'Р¦Р',
  'Р¤Р',
  'РњР',
  'Р§Р',
  'РЎР',
  'РќР',
  'СЂР',
  'СЏ',
  'СЋ',
  'С‚',
  'СЃ',
  'С‡',
  'рџ',
  'вЂ',
  'вќ',
  'пёЏ',
]

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, out)
      continue
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(fullPath)
    }
  }

  return out
}

function escapeForCmd(value) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function runGit(args) {
  const command = ['git', ...args.map(escapeForCmd)].join(' ')
  return cp.execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
}

function scanText(fileLabel, content, findings) {
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    if (!SUSPICIOUS_MARKERS.some((marker) => line.includes(marker))) return

    findings.push({
      file: fileLabel,
      line: index + 1,
      text: line.trim(),
    })
  })
}

function getTrackedStagedFiles() {
  const output = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACM']).trim()

  if (!output) return []

  return output
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((file) => {
      const normalized = file.replace(/\\/g, '/')
      return (
        normalized.startsWith('src/') ||
        normalized === 'CLAUDE.md' ||
        normalized.startsWith('docs/')
      )
    })
    .filter((file) => TEXT_EXTENSIONS.has(path.extname(file)))
}

function scanWorkingTree() {
  const findings = []
  const files = walk(SRC_DIR)

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    scanText(path.relative(ROOT, file), content, findings)
  }

  return findings
}

function scanStaged() {
  const findings = []
  const files = getTrackedStagedFiles()

  for (const file of files) {
    const content = runGit(['show', `:${file}`])

    scanText(file, content, findings)
  }

  return findings
}

const stagedOnly = process.argv.includes('--staged')
const findings = stagedOnly ? scanStaged() : scanWorkingTree()

if (findings.length > 0) {
  console.error(`Potential mojibake found${stagedOnly ? ' in staged files' : ''}:`)
  findings.forEach((item) => {
    console.error(`${item.file}:${item.line}: ${item.text}`)
  })
  process.exit(1)
}

console.log(`Encoding check passed${stagedOnly ? ' (staged)' : ''}`)
