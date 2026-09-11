import { parse, compileTemplate } from "@vue/compiler-sfc";
import { DEFAULT_UI_ATTRS, SKIP_ATTRS, isUserFacing, looksLikeCss } from "./heuristics.mjs";

function isUi(v) {
  return isUserFacing(v) && !looksLikeCss(v);
}

export function extractVueFile(rel, code, opts = {}) {
  const uiAttrs = opts.uiAttrs || DEFAULT_UI_ATTRS;
  const recs = [];
  let parsed;
  try {
    parsed = parse(code, { filename: rel });
  } catch {
    return recs; // unparseable file: skip, never guess
  }
  if (parsed.errors && parsed.errors.length && !parsed.descriptor?.template) return recs;
  const descriptor = parsed.descriptor;
  const template = descriptor.template;
  if (!template || !template.ast) return recs;

  // compileTemplate's AST loc offsets are relative to the source it was given;
  // pass the template block content and shift by the block's absolute offset.
  const blockStart = template.loc.start.offset;
  const tmplSrc = code.slice(blockStart, template.loc.end.offset);
  let ast;
  try {
    ast = compileTemplate({ source: tmplSrc, filename: rel, id: rel }).ast;
  } catch {
    return recs;
  }
  if (!ast) return recs;

  (function visit(node) {
    if (!node) return;
    switch (node.type) {
      case 2: // TEXT
        if (isUi(node.content)) {
          recs.push({
            file: rel,
            start: blockStart + node.loc.start.offset,
            end: blockStart + node.loc.end.offset,
            kind: "text",
            text: node.content,
          });
        }
        break;
      case 1: // ELEMENT
      case 9: { // IF (directives are skipped inherently; we only read static props)
        for (const prop of node.props || []) {
          // skip bindings (:foo / v-bind:foo) and directives (v-if etc.)
          if (prop.type !== 6 /* ATTRIBUTE */) continue;
          const name = prop.name;
          if (SKIP_ATTRS.has(name)) continue;
          if (!uiAttrs.has(name) && !name.startsWith("aria-")) continue;
          const raw = prop.value?.content ?? "";
          if (!isUi(raw)) continue;
          const vloc = prop.value.loc;
          recs.push({
            file: rel,
            start: blockStart + vloc.start.offset,
            end: blockStart + vloc.end.offset,
            kind: "attr",
            text: raw,
          });
        }
        break;
      }
      default:
        break;
    }
    for (const c of node.children || []) visit(c);
    for (const b of node.branches || []) visit(b);
  })(ast);

  return recs;
}
