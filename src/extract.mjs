import fs from "fs";
import path from "path";
import { parseCode, traverse } from "./parse.mjs";
import { DEFAULT_UI_ATTRS, SKIP_ATTRS, isUserFacing, looksLikeCss } from "./heuristics.mjs";

export function walkFiles(dir, exts = [".tsx", ".jsx"], ignore = ["node_modules", ".git", "dist", "build"]) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!ignore.includes(e.name)) walk(p);
      } else if (exts.some((x) => e.name.endsWith(x)) && !/\.(test|spec)\.[jt]sx?$/.test(e.name)) {
        out.push(p);
      }
    }
  })(dir);
  return out.sort();
}

// Walk up from a node to decide whether a string is in JSX *render* position
// (a branch of a ternary / && inside a JSXExpressionContainer) rather than in
// logic (comparisons, call args, object values). Returns { attr } or null.
function renderContext(p) {
  let cur = p;
  while (cur && cur.parentPath) {
    const par = cur.parentPath;
    const pn = par.node;
    const cn = cur.node;
    switch (pn.type) {
      case "ConditionalExpression":
        if (pn.test === cn) return null;
        break;
      case "LogicalExpression":
        if (pn.operator === "&&" && pn.left === cn) return null;
        break;
      case "ParenthesizedExpression":
      case "TSAsExpression":
      case "TSNonNullExpression":
        break;
      case "JSXExpressionContainer": {
        const g = par.parentPath?.node;
        if (g && (g.type === "JSXElement" || g.type === "JSXFragment")) return { attr: null };
        if (g && g.type === "JSXAttribute") return { attr: g.name?.name };
        return null;
      }
      default:
        return null;
    }
    cur = par;
  }
  return null;
}

function isUi(v) {
  return isUserFacing(v) && !looksLikeCss(v);
}

export function extractFile(rel, code, opts = {}) {
  const uiAttrs = opts.uiAttrs || DEFAULT_UI_ATTRS;
  const recs = [];
  let ast;
  try {
    ast = parseCode(code);
  } catch {
    return recs; // unparseable file: skip, never guess
  }
  traverse(ast, {
    JSXText(p) {
      const raw = p.node.value;
      if (!isUi(raw)) return;
      recs.push({ file: rel, start: p.node.start, end: p.node.end, kind: "jsxText", text: raw });
    },
    JSXAttribute(p) {
      const n = p.node.name;
      if (n.type !== "JSXIdentifier") return;
      const name = n.name;
      if (SKIP_ATTRS.has(name)) return;
      if (!uiAttrs.has(name) && !name.startsWith("aria-")) return;
      const v = p.node.value;
      if (!v || v.type !== "StringLiteral" || !isUi(v.value)) return;
      recs.push({ file: rel, start: v.start, end: v.end, kind: "attr", text: v.value });
    },
    StringLiteral(p) {
      const ctx = renderContext(p);
      if (!ctx) return;
      if (ctx.attr && (SKIP_ATTRS.has(ctx.attr) || (!uiAttrs.has(ctx.attr) && !ctx.attr.startsWith("aria-")))) return;
      if (!isUi(p.node.value)) return;
      recs.push({ file: rel, start: p.node.start, end: p.node.end, kind: ctx.attr ? "attr" : "expr", text: p.node.value });
    },
    TemplateLiteral(p) {
      const ctx = renderContext(p);
      if (!ctx) return;
      if (ctx.attr && SKIP_ATTRS.has(ctx.attr)) return;
      const cooked = p.node.quasis.map((q) => q.value.cooked ?? "");
      const joined = cooked.join(" ").trim();
      if (!isUi(joined)) return;
      let norm = "";
      for (let i = 0; i < cooked.length; i++) {
        norm += cooked[i];
        if (i < p.node.expressions.length) norm += "{" + i + "}";
      }
      const exprs = p.node.expressions.map((e) => code.slice(e.start, e.end));
      recs.push({ file: rel, start: p.node.start, end: p.node.end, kind: "template", text: norm, exprs });
    },
  });
  return recs;
}

export function extract(dir, opts = {}) {
  const files = walkFiles(dir, opts.exts);
  const records = [];
  for (const f of files) {
    const rel = path.relative(dir, f);
    records.push(...extractFile(rel, fs.readFileSync(f, "utf8"), opts));
  }
  const unique = new Map();
  for (const r of records) {
    const k = r.kind === "template" ? r.text : r.text.trim();
    if (!unique.has(k)) unique.set(k, { kind: r.kind, count: 0 });
    unique.get(k).count++;
  }
  return { files, records, unique };
}
