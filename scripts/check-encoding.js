const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md"]);

function fromCodes(...codes) {
  return String.fromCharCode(...codes);
}

const SUSPICIOUS_MARKERS = [
  fromCodes(0x0420, 0x045f, 0x0420),
  fromCodes(0x0420, 0x201c, 0x0420),
  fromCodes(0x0420, 0x2014, 0x0420),
  fromCodes(0x0420, 0x00a6, 0x0420),
  fromCodes(0x0420, 0x00a4, 0x0420),
  fromCodes(0x0420, 0x045a, 0x0420),
  fromCodes(0x0420, 0x00a7, 0x0420),
  fromCodes(0x0420, 0x040e, 0x0420),
  fromCodes(0x0420, 0x045c, 0x0420),
  fromCodes(0x0421, 0x0402, 0x0420),
  fromCodes(0x0421, 0x0457),
  fromCodes(0x0421, 0x045b),
  fromCodes(0x0421, 0x201a),
  fromCodes(0x0421, 0x0453),
  fromCodes(0x0421, 0x2021),
  fromCodes(0x0440, 0x045f),
  fromCodes(0x0432, 0x20ac),
  fromCodes(0x0432, 0x045c),
  fromCodes(0x043f, 0x0451, 0x040f),
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(fullPath);
    }
  }

  return out;
}

function scanText(fileLabel, content, findings) {
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!SUSPICIOUS_MARKERS.some((marker) => line.includes(marker))) return;

    findings.push({
      file: fileLabel,
      line: index + 1,
      text: line.trim(),
    });
  });
}

const findings = [];
const files = walk(SRC_DIR);

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  scanText(path.relative(ROOT, file), content, findings);
}

if (findings.length > 0) {
  console.error("Potential mojibake found:");
  findings.forEach((item) => {
    console.error(`${item.file}:${item.line}: ${item.text}`);
  });
  process.exit(1);
}

console.log("Encoding check passed");
