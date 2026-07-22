# Good first issues

Small, self-contained ways to help. Each links a heuristic or feature to a concrete PR.

1. **Add a failing fixture.** Find a real `.tsx` where extraction grabs a CSS class,
   a route, or a `x === "..."` comparison — or misses real prose. Drop it in
   `examples/` and open an issue. Fixing `src/heuristics.mjs` to handle it is the PR.

2. **Skip strings already inside `t()` / `<Trans>`.** If a project is partly
   internationalised, don't re-extract text that's already wrapped. Roadmap v0.2.

3. **`--report` flag.** Before writing, print a per-file preview of what `apply`
   would change. Read-only, low-risk, high-value for trust.

4. **A Svelte or Vue extractor stub.** Just one node type to start.

5. **Docs.** Anything in the README that tripped you up when you first ran it.
