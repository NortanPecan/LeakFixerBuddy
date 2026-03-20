const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const SRC_DIR = path.join(ROOT, 'src')
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md'])

function fromCodes(...codes) {
  return String.fromCharCode(...codes)
}

const SUSPICIOUS_MARKERS = [
  fromCodes(0x0420, 0x045F, 0x0420),
  fromCodes(0x0420, 0x201C, 0x0420),
  fromCodes(0x0420, 0x2014, 0x0420),
  fromCodes(0x0420, 0x00A6, 0x0420),
  fromCodes(0x0420, 0x00A4, 0x0420),
  fromCodes(0x0420, 0x045A, 0x0420),
  fromCodes(0x0420, 0x00A7, 0x0420),
  fromCodes(0x0420, 0x040E, 0x0420),
  fromCodes(0x0420, 0x045C, 0x0420),
  fromCodes(0x0421, 0x0402, 0x0420),
  fromCodes(0x0421, 0x0457),
  fromCodes(0x0421, 0x045B),
  fromCodes(0x0421, 0x201A),
  fromCodes(0x0421, 0x0453),
  fromCodes(0x0421, 0x2021),
  fromCodes(0x0440, 0x045F),
  fromCodes(0x0432, 0x20AC),
  fromCodes(0x0432, 0x045C),
  fromCodes(0x043F, 0x0451, 0x040F),
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

const findings = []
const files = walk(SRC_DIR)

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  scanText(path.relative(ROOT, file), content, findings)
}

if (findings.length > 0) {
  console.error('Potential mojibake found:')
  findings.forEach((item) => {
    console.error(`${item.file}:${item.line}: ${item.text}`)
  })
  process.exit(1)
}

console.log('Encoding check passed')
