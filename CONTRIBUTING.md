# Contributing to stringlift

Thanks for helping. This project exists because retrofitting i18n by hand is dangerous, and a good tool should make it safe. Contributions that strengthen the **safety guarantee** or widen **real-world coverage** are the most valuable.

## Setup

```bash
git clone https://github.com/idomy/stringlift
cd stringlift
npm install
node bin/cli.mjs extract examples/demo-app
```

## The one rule

**Nothing but text may change, and `verify` must prove it.**
Any change to extraction or application must keep this true:

```bash
node bin/cli.mjs apply examples/demo-app --glossary examples/demo.glossary.json --out /tmp/out
node bin/cli.mjs verify examples/demo-app /tmp/out   # must be green
```

If your change makes `verify` report a structural difference, that's a regression — the whole point is that it never does.

## Good first issues

- **A failing fixture.** Find a `.tsx` snippet where `extract` grabs a CSS class or a comparison operand, or misses real prose. Add it under `examples/`, open an issue, and (bonus) fix the heuristic in `src/heuristics.mjs`.
- **A framework adapter.** Start with the extractor for one node type in Vue or Svelte.
- **Docs.** Clarify anything that tripped you up.

## Where things live

| File | Responsibility |
|---|---|
| `src/parse.mjs` | Babel parse + traverse wiring |
| `src/heuristics.mjs` | What counts as user-facing; what to skip |
| `src/extract.mjs` | Find translatable strings + their exact source offsets |
| `src/apply.mjs` | Replace them safely (JS escapes, JSX entities, templates) |
| `src/verify.mjs` | The AST-skeleton proof |
| `bin/cli.mjs` | The `extract` / `apply` / `verify` commands |

## Style

- Small, focused PRs. One heuristic, one adapter, one fix.
- No new runtime dependencies without discussion. The core is intentionally tiny (just Babel).
- When in doubt, make the tool **skip** rather than risk a wrong edit.

## Code of conduct

Be kind and assume good faith. This is a community project; treat contributors the way you'd want to be treated.
