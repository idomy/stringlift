import fs from "fs";
import path from "path";
import { parseCode, traverse } from "./parse.mjs";
import { walkFiles } from "./extract.mjs";

// A structural "skeleton" of the file: the sequence of AST node types and
// identifiers, but with every string/template treated as ONE opaque token.
// If two files have identical skeletons, they differ ONLY inside string or
// template contents — i.e. no code, JSX structure, or identifier changed.
function skeleton(code) {
  const ast = parseCode(code);
  const out = [];
  traverse(ast, {
    enter(p) {
      const n = p.node;
      if (n.type === "StringLiteral") { out.push("STR"); p.skip(); return; }
      if (n.type === "TemplateLiteral") { out.push("TPL"); p.skip(); return; }
      if (n.type === "JSXText") { out.push("JSXTEXT"); return; }
      if (n.type === "Identifier") { out.push("Id:" + n.name); return; }
      if (n.type === "JSXIdentifier") { out.push("JsxId:" + n.name); return; }
      out.push(n.type);
    },
  });
  return out;
}

// Verify that `newDir` differs from `origDir` only inside string/template
// literals. Returns { checked, identical, diffs: [{file, at, before, after}] }.
export function verify(origDir, newDir, opts = {}) {
  const files = walkFiles(newDir, opts.exts);
  const diffs = [];
  let identical = 0;
  for (const f of files) {
    const rel = path.relative(newDir, f);
    const origPath = path.join(origDir, rel);
    if (!fs.existsSync(origPath)) continue;
    try {
      const a = skeleton(fs.readFileSync(origPath, "utf8"));
      const b = skeleton(fs.readFileSync(f, "utf8"));
      if (a.length === b.length && a.every((x, i) => x === b[i])) {
        identical++;
      } else {
        let i = 0;
        while (i < a.length && i < b.length && a[i] === b[i]) i++;
        diffs.push({ file: rel, at: i, before: a.slice(i, i + 4), after: b.slice(i, i + 4) });
      }
    } catch (e) {
      diffs.push({ file: rel, at: -1, before: "PARSE", after: e.message.split("\n")[0] });
    }
  }
  return { checked: files.length, identical, diffs };
}
