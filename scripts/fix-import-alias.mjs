import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

const exts = [".js", ".jsx", ".ts", ".tsx"];

function existsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function resolveToExistingFile(absNoExtOrWithExt) {
  // If exact file exists
  if (existsFile(absNoExtOrWithExt)) return absNoExtOrWithExt;

  // Try adding extensions
  for (const ext of exts) {
    const p = absNoExtOrWithExt + ext;
    if (existsFile(p)) return p;
  }

  // Try index files if it's a directory
  try {
    if (fs.statSync(absNoExtOrWithExt).isDirectory()) {
      for (const ext of exts) {
        const p = path.join(absNoExtOrWithExt, "index" + ext);
        if (existsFile(p)) return p;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules / dist / build if somehow inside src
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") continue;
      walk(full, out);
    } else if (entry.isFile()) {
      if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(full);
    }
  }
  return out;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function fixFile(filePath) {
  const dir = path.dirname(filePath);
  const original = fs.readFileSync(filePath, "utf8");

  // Matches:
  // import ... from "..."
  // export ... from "..."
  // import("...")   (dynamic import) - we will also handle
  const patterns = [
    {
      re: /(import\s+[^;]*?\s+from\s+)(["'])([^"']+)\2/g,
      groupPrefix: 1,
      groupQuote: 2,
      groupSpec: 3,
    },
    {
      re: /(export\s+[^;]*?\s+from\s+)(["'])([^"']+)\2/g,
      groupPrefix: 1,
      groupQuote: 2,
      groupSpec: 3,
    },
    {
      re: /(import\()\s*(["'])([^"']+)\2(\s*\))/g,
      groupPrefix: 1,
      groupQuote: 2,
      groupSpec: 3,
      groupSuffix: 4,
    },
  ];

  let changed = false;
  let next = original;

  for (const pat of patterns) {
    next = next.replace(pat.re, (match, a, q, spec, d) => {
      const prefix = a;
      const quote = q;
      const suffix = d ?? "";

      if (!spec.startsWith(".")) return match;

      // Resolve to absolute candidate
      const absCandidate = path.resolve(dir, spec);
      const resolved = resolveToExistingFile(absCandidate);

      if (!resolved) return match;

      // Only rewrite if target is inside src/
      const relFromSrc = path.relative(srcRoot, resolved);
      if (relFromSrc.startsWith("..") || path.isAbsolute(relFromSrc) === false && relFromSrc.includes(":")) {
        return match;
      }

      const aliased = "@/" + toPosix(relFromSrc).replace(/\.(js|jsx|ts|tsx)$/, "");
      changed = true;

      // Keep original prefix/suffix shape
      if (pat.groupSuffix) {
        return `${prefix}${quote}${aliased}${quote}${suffix}`;
      }
      return `${prefix}${quote}${aliased}${quote}`;
    });
  }

  if (changed && next !== original) {
    fs.writeFileSync(filePath, next, "utf8");
    return true;
  }
  return false;
}

if (!fs.existsSync(srcRoot)) {
  console.error("ERROR: src/ folder not found at project root:", srcRoot);
  process.exit(1);
}

const files = walk(srcRoot);
let touched = 0;

for (const f of files) {
  if (fixFile(f)) touched += 1;
}

console.log(`Rewrote imports in ${touched} file(s).`);
