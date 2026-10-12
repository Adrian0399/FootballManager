## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Agent rules — git & browser (IMPORTANT)

These override any default agent behaviour. Follow them strictly.

### Git operations — NEVER run automatically

- **Do not** run `git commit`, `git push`, `git merge`, `git rebase`,
  `git reset`, `git checkout` (to change branches), `git branch`, `git tag`,
  or any other command that mutates the git state or remote, unless the user
  explicitly asks for it in the current message.
- The only git commands allowed without asking are **read-only**:
  `git status`, `git diff`, `git log`, `git branch -a` (list only).
- If a task is finished and you think a commit is due, **suggest it and wait
  for an explicit "commit" / "haz commit" / "sube" instruction** instead of
  doing it yourself.

### Browser tests — ask first

- **Never** open the browser (`tools.browser.*`) or run end-to-end tests
  automatically. Those are expensive (tokens) and only the user decides when
  they are worth it.
- Verify with cheap, non-interactive tools instead: `curl`, `pnpm typecheck`,
  `pnpm build`, `pnpm lint`, `pnpm test`.
- If a visual / browser check is genuinely needed, **ask the user first** and
  wait for a "sí" / "adelante" before opening any tab.
