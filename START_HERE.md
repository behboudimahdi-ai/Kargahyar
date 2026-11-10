# KargahYar — Codex Start Here

This repository currently contains the **engineering specifications and a ZIP containing the standalone database reference prototype**, not a complete Next.js application.

## Read first
1. [AGENTS.md](./AGENTS.md) — durable implementation rules
2. [KARGAHYAR_CODEX_HANDOFF.md](./KARGAHYAR_CODEX_HANDOFF.md) — full product and technical requirements
3. [kargahyar-codex-ready.zip](./kargahyar-codex-ready.zip) — existing handoff bundle. It contains `references/database-prototype/`, which is a reference only, not an operational database.

## Codex kickoff

> Inspect the repository and read AGENTS.md and KARGAHYAR_CODEX_HANDOFF.md in full. Check the existing ZIP reference before implementation if useful, but do not replace the new app's package.json with the prototype's package.json. Bootstrap the approved Next.js 16 / React 19 / TypeScript strict / Tailwind 4 app and PostgreSQL 18 / Prisma 7 setup. Implement secure authentication and the database-backed order → batch → assignment → production entry → supervisor approval → dashboard flow. Test every executable milestone. Work on a feature branch, open a pull request, and report real commands/results; don't claim services are working without running them.

## Important
- Never commit real credentials or staff records. The GitHub repository may be public.
- Preserve existing files; inspect before changing anything.
- Use Windows PowerShell setup steps in README once implementation exists.
- ZIP files and Markdown requirements are **not** a functioning app. The Prisma reference schema requires validation and migration in the target application.
