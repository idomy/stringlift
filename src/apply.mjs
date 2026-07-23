import fs from "fs";
import path from "path";

const ENTITY = { '"': "&quot;", "'": "&apos;" };

// JS string literal (expression context): backslash escaping.
function escapeJsString(orig, text) {
  const q = orig[0];
  let body = text.replace(/\\/g, "\\\\");
  body = q === '"' ? body.replace(/"/g, '\\"') : body.replace(/'/g, "\\'");
  body = body.replace(/\n/g, "\\n");
  return q + body + q;
}

// JSX attribute string literal: no backslash escapes — use HTML entities.
function escapeJsxAttr(orig, text) {
  const q = orig[0];
  let body = text;
  if (body.includes(q)) body = body.split(q).join(ENTITY[q]);
  return q + body + q;
}

// JSX text node: <>{}& would break the markup, so encode them.
function encodeJsxText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;");
}

// Rebuild a template literal from a translated, placeholder-preserving string.
function buildTemplate(translated, exprs) {
  let out = "`";
  for (let i = 0; i < translated.length; i++) {
    const m = translated.slice(i).match(/^\{(\d+)\}/);
    if (m) {
      out += "${" + exprs[Number(m[1])] + "}";
      i += m[0].length - 1;
    } else {
      const ch = translated[i];
      if (ch === "`") out += "\\`";
      else if (ch === "\\") out += "\\\\";
      else if (ch === "$" && translated[i + 1] === "{") { out += "\\${"; i++; }
      else out += ch;
    }
  }
  return out + "`";
}

const decodeEntities = (s) =>
  s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, g) => {
    if (g[0] === "#") {
      const hex = g[1] === "x" || g[1] === "X";
      return String.fromCodePoint(parseInt(hex ? g.slice(2) : g.slice(1), hex ? 16 : 10));
    }
    const named = { quot: '"', apos: "'", amp: "&", lt: "<", gt: ">", nbsp: " ",
      rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
      hellip: "…", middot: "·", rarr: "→", larr: "←",
      mdash: "—", ndash: "–", times: "×", laquo: "«", raquo: "»" };
    return named[g] !== undefined ? named[g] : m;
  });

// Group the glossary results that apply() would use, without reading or writing files.
export function report(records, glossary) {
  const byFile = new Map();
  for (const r of records) {
    const source = r.kind === "template" ? r.text : r.text.trim();
    const translation = glossary[source];
    if (!byFile.has(r.file)) byFile.set(r.file, []);
    byFile.get(r.file).push({
      source,
      translation: translation == null || translation === source ? null : translation,
    });
  }
  return byFile;
}

// Apply a glossary { sourceString: translation } to every file, writing to destDir.
// Replacements run bottom-up so earlier byte offsets stay valid.
export function apply(records, glossary, srcDir, destDir) {
  const byFile = new Map();
  for (const r of records) {
    if (!byFile.has(r.file)) byFile.set(r.file, []);
    byFile.get(r.file).push(r);
  }
  const stats = { applied: 0, skipped: 0, filesChanged: 0, problems: [] };

  for (const [rel, recs] of byFile) {
    let s = fs.readFileSync(path.join(srcDir, rel), "utf8");
    recs.sort((a, b) => b.start - a.start);
    let changed = false;

    for (const r of recs) {
      const key = r.kind === "template" ? r.text : r.text.trim();
      const it = glossary[key];
      if (it == null || it === key) { stats.skipped++; continue; }
      const orig = s.slice(r.start, r.end);
      let replacement;

      if (r.kind === "jsxText") {
        if (orig !== r.text && decodeEntities(orig) !== r.text) { stats.skipped++; stats.problems.push([rel, "jsxText offset"]); continue; }
        const m = orig.match(/^(\s*)[\s\S]*?(\s*)$/);
        replacement = m[1] + encodeJsxText(it) + m[2];
      } else if (r.kind === "attr") {
        if (orig[0] !== '"' && orig[0] !== "'") { stats.skipped++; continue; }
        replacement = escapeJsxAttr(orig, it);
      } else if (r.kind === "expr") {
        if (orig[0] !== '"' && orig[0] !== "'") { stats.skipped++; continue; }
        replacement = escapeJsString(orig, it);
      } else if (r.kind === "template") {
        if (orig[0] !== "`") { stats.skipped++; continue; }
        replacement = buildTemplate(it, r.exprs);
      } else { stats.skipped++; continue; }

      s = s.slice(0, r.start) + replacement + s.slice(r.end);
      stats.applied++;
      changed = true;
    }

    const dst = path.join(destDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, s);
    if (changed) stats.filesChanged++;
  }
  return stats;
}
