import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const htmlFiles = [join(root, "index.html"), ...(await readdir(join(root, "pages"))).filter((name) => name.endsWith(".html")).map((name) => join(root, "pages", name))];
const missing = [];
const absoluteWindowsPaths = [];
const localReferences = new Set();

for (const htmlFile of htmlFiles) {
  const source = await readFile(htmlFile, "utf8");
  if (/[A-Za-z]:\\/.test(source)) absoluteWindowsPaths.push(htmlFile);
  for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    const reference = match[1];
    if (/^(?:https?:|data:|mailto:|tel:|#|javascript:)/i.test(reference)) continue;
    const clean = reference.split(/[?#]/)[0];
    if (!clean) continue;
    const target = normalize(join(dirname(htmlFile), clean));
    localReferences.add(target);
    try { await stat(target); } catch { missing.push(`${htmlFile} -> ${reference}`); }
  }
}

if (absoluteWindowsPaths.length || missing.length) {
  if (absoluteWindowsPaths.length) console.error("Absolute Windows paths:", absoluteWindowsPaths);
  if (missing.length) console.error("Missing local references:", missing);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${htmlFiles.length} HTML files checked.`);
  console.log(`PASS: ${localReferences.size} unique local asset/page references resolve.`);
  console.log("PASS: no absolute Windows paths in HTML.");
}

