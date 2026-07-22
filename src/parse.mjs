import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

export const traverse = _traverse.default?.default ?? _traverse.default ?? _traverse;

export function parseCode(code) {
  return parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
    errorRecovery: true,
  });
}
