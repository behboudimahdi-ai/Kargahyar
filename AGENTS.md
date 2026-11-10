# AGENTS.md — KargahYar Codex instructions

Read `KARGAHYAR_CODEX_HANDOFF.md` before making changes. If the file is not present, ask for the handoff or use the user's task instructions as source of truth.

## Rules
- Stack is locked: Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, Lucide React, Node 24, PostgreSQL 18, Prisma 7, Turbopack. Feature-based server-first architecture. Windows development; eventual Docker + Nginx deployment.
- Primary UX: Persian, RTL, mobile-first, accessible, responsive.
- Safety: never expose public app before auth/RBAC; never trust client-supplied reviewer IDs; never embed credentials, delete data, or run destructive migrations without explicit authorization.
- Counting: ProductionEntry quantities measure a single operation. Completed garments must only be counted at final accepted completion. Sum only approved records; avoid duplicate retry counting.
- Production workflow: PENDING -> APPROVED/REJECTED, enforce transitions and record authenticated reviewer plus AuditLog transactionally.
- Build actual DB-backed features; do not present mock HTML as a finished product.
- Keep migrations under version control. Test with executable commands and report what ran, what passed and what is blocked.
- No unapproved payroll penalty automation; staff and output baseline values are not hard-coded facts.
- Prior database zip and old MVP zip are reference artifacts, not a running app or an authoritative repo. Inspect first and integrate selectively.

## First milestone
Inspect the current repository; establish dependency and migration baseline; implement database-backed secure order -> batch -> assignment -> production entry -> approval -> dashboard vertical slice; document Windows setup. Stop and explain any real blocker; otherwise implement rather than writing a speculative plan.
