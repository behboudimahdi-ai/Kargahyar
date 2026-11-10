# KargahYar — Codex Engineering Handoff

**Project:** کارگاه‌یار / KargahYar  
**Document version:** 1.0 — 2026-11-10  
**Objective:** Build a real, maintainable Persian/RTL garment-workshop production management web application, not a static HTML mockup.

> **Instructions to Codex:** You are the implementation engineer. Read this entire handoff before editing files. If a repository exists, inspect it first; do not assume old files, running services, connections or migrations exist. Build incrementally in small, testable commits. Make a working local MVP, report executed commands and their actual outcomes. Never claim tests passed unless you ran them. Never deploy or use real employee information without secure authentication and authorization.

## 1. Project context and purpose

The product serves a women's garment manufacturing workshop in the Tehran/Shahriar area. Primary use case: **free-size, single-pocket shomiz** production. The workshop has roughly 14 active staff as a *historical snapshot* (2026-10-31), and produced fewer than 100 defect-free garments/day at that time. The goal is to move from informal/manual work management to structured order tracking, station/operation assignments, reliable production counts, quality approvals and actionable management dashboards.

**Do not hard-code staff count, output target, equipment count, wage amounts or shift schedules:** all must be editable settings or operational data. Past baseline figures are context, not live records. The plant may have intermittent internet; design an offline sync extension path, but do not represent offline behavior as implemented until it is tested.

Main users: owner/manager, supervisor, assistant supervisor, operators; optionally read-only observers. Primary entry by supervisor/assistant; operators can report their task progress. Must work on laptop and Android phone; UI **Persian, RTL, mobile-first**.

## 2. Locked technical stack

| Concern | Decision |
|---|---|
| Framework | Next.js 16, App Router |
| UI | React 19 |
| Language | TypeScript with `strict: true` |
| CSS | Tailwind CSS 4 |
| Icons | Lucide React |
| Runtime | Node.js 24 |
| Dev bundler | Turbopack |
| Database | PostgreSQL 18 |
| ORM | Prisma 7; migrations committed to Git |
| Architecture | Server-first, feature-based modular structure |
| UI architecture | Atomic Design principles + reusable Design System |
| Deployment target | Docker Compose + Nginx reverse proxy (deploy later) |
| OS for local development | Windows / VS Code / Git / npm / Docker Desktop |

Use **Prisma 7** syntax and a PostgreSQL adapter (`@prisma/adapter-pg`), `prisma.config.ts` per the installed Prisma 7 release, and generated client imports; do not copy Prisma 6 examples blindly. Pin compatible dependency versions and verify actual compatibility by running commands. No paid API or external credentials are needed for core MVP.

## 3. MVP (ship this first)

1. **Authentication + RBAC**: secure sign-in; server-side role checks. Roles: OWNER, MANAGER, SUPERVISOR, ASSISTANT, OPERATOR, VIEWER. Prevent cross-workshop data access. Do not trust role/approver IDs sent by client.
2. **Product catalog and routing**: add product model and ordered sewing operations; operation sequence is editable before production starts. Seed *illustrative* operations for shomiz without inventing the workshop's actual 55-step process sheet.
3. **Production orders**: create and list orders with order number, customer (optional), model, quantity, due date, notes and status.
4. **Batches and assignments**: divide order items into production batches; assign employee, sewing operation and optionally machine. Show assigned, completed and remaining operation units.
5. **Production entry**: employee or supervisor submits operation-level `producedQty`, defective subset `defectiveQty`, date, batch, operation and worker. Default `PENDING`. Must support an idempotency key for retries.
6. **Supervisor review**: only authorized user can `APPROVE` or `REJECT`; a production entry cannot approve itself or be approved twice. Approval, timestamp and audit log must commit in one DB transaction. Rejections require explanation. Protect against tampering with approved history.
7. **Quality control**: log defect category/reason and count; track `OPEN`, `REWORKING`, `RESOLVED`, `SCRAPPED`. Corrected units need proper auditable accounting, not silent overwrites.
8. **Dashboard**: confirmed orders, batch progress, pending approvals, approved good/defective operational throughput, and garment completion only when the designated final completion step is approved. Filters for date/order/employee.
9. **Persian RTL UX**: readable forms, accessible navigation, responsive desktop/mobile, Persian labels; persist dates as PostgreSQL date/timestamps; display in Tehran timezone and optionally Jalali format.

**Out of MVP:** advanced payroll calculations/penalties, production balancing engine, automatic machine monitoring, n8n/Telegram integrations, full offline synchronization, AI recommendations, complex scheduling. Plan data extension points but do not delay delivery with these features.

## 4. Data model — baseline and constraints

An earlier **standalone database prototype** exists (`kargahyar-database.zip`, if supplied separately). It is NOT a deployed database and has NOT been validated or migrated here. It contains 16 Prisma entities:

`Workshop`, `User`, `Membership`, `Employee`, `Machine`, `Operation`, `ProductModel`, `ProductOperation`, `ProductionOrder`, `OrderItem`, `ProductionBatch`, `Assignment`, `ProductionEntry`, `QualityIssue`, `Attendance`, `AuditLog`.

If attached, inspect its `prisma/schema.prisma`, `prisma.config.ts`, `src/server/db.ts`, `compose.yaml`, `docs/DATA_RULES.md`, and `prisma/after-migrate.sql`, then adapt/repair as necessary. If missing, design equivalent schema from this handoff; **do not block work on absent attachments**. Do not blindly merge its independent `package.json` into a Next.js app.

Required relationships:
- Workshop 1:N Membership, Employee, Machine, ProductModel, Operation, ProductionOrder, ProductionBatch.
- User 1:N Membership; Employee optionally linked to User.
- ProductModel 1:N ProductOperation (ordered routing steps).
- ProductionOrder 1:N OrderItem; OrderItem N:1 ProductModel; OrderItem 1:N ProductionBatch.
- ProductionBatch 1:N Assignment and ProductionEntry.
- Assignment references Employee + Operation + optional Machine.
- ProductionEntry references Workshop, Batch, Employee, Operation, submitting User and optional reviewing User; may reference Assignment.
- QualityIssue references ProductionEntry; Attendance references Employee; AuditLog stores actor, entity and before/after data.

Required enums: `Role`, `OrderStatus`, `BatchStatus`, `EntryStatus`, `QCStatus`, `AttendanceStatus`, `MachineType` (equivalents acceptable if coherent).

**Integrity rules:**
- Tenant/workshop ownership must be validated for every referenced ID on every mutation; plain foreign keys on independent IDs are insufficient to prevent cross-tenant reference attacks.
- Positive order, batch and production quantities. `0 <= defectiveQty <= producedQty`. Quality issues should not exceed the relevant defective quantity without a modeled reconciliation rule.
- ProductionEntry counts are **units processed for ONE operation**, NOT distinct finished garments. Never sum all operations to compute garment completion.
- `goodQty = producedQty - defectiveQty` only for approved operation entries, with a clear policy for rework/voids. Completed garment counts must be tied to final inspection/completion, not total operations.
- Status transition `PENDING -> APPROVED/REJECTED` must be atomic and idempotently protected, with authenticated reviewer, review time and audit entry.
- Corrections of approved quantities must use explicit reversal/versioning/audit, not in-place silent edits. Do not hard-delete historical production entries.
- Stable unique submission/client idempotency key prevents duplicate entries on network retry.
- Date-only columns use `DATE`, timestamps UTC, UI in workshop timezone (default `Asia/Tehran`); Jalali is UI formatting, not database storage.
- Route revisions need snapshots when changed after production begins; MVP may prohibit editing routes for active batches rather than implementing full historical snapshots.
- Keep salary/payroll policy separate from attendance and production evidence; never automatically fine staff for an unreviewed quality issue.
- Add indexes for date, workshop, order/batch, approval state; use migrations and constraints. Do not reset persistent volumes or run destructive migrations without explicit permission.

## 5. Workflow and acceptance scenario

Illustrative test data only (NOT real workshop records):
- Manager creates product `شومیز فری‌سایز تک‌جیب`, with a small sample route.
- Manager creates order `ORD-DEMO-001`, quantity `200`, due date, and one batch `BATCH-DEMO-001` of 200.
- Supervisor assigns operator `اپراتور آزمایشی` to one operation.
- Operator submits production entry of `85 processed`, `3 defective`, for that operation.
- Dashboard shows the entry as pending and **does not add 82 to approved totals** yet.
- Supervisor approves; approved good **operation count** increases by `82` and defective by `3`; batch finished garments do NOT automatically increase unless that operation is designated final completion and accepted by the domain rules.
- Approval repeated should not count twice; unprivileged reviewer gets forbidden; wrong workshop access forbidden; malformed or negative quantities rejected.
- Record actor, timestamp, state transition and audit trail.

At least these scenarios must be covered by tests.

## 6. Recommended source structure

```text
kargahyar/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   └── api/
│   ├── features/
│   │   ├── auth/
│   │   ├── orders/
│   │   ├── products/
│   │   ├── production/
│   │   ├── assignments/
│   │   ├── quality/
│   │   ├── employees/
│   │   └── dashboard/
│   ├── components/{ui,layout,shared}/
│   ├── lib/
│   ├── server/
│   └── generated/prisma/  # generated, gitignored
├── prisma/{schema.prisma,seed.ts,migrations/}
├── tests/
├── docker/nginx/
├── docs/
├── .env.example
├── prisma.config.ts
├── compose.yaml
├── AGENTS.md
└── README.md
```

Server Components by default; client components only for interactive forms/tables. Put authorization and business logic in server services, not the browser. Validate all input at the trust boundary (e.g., Zod). Use accessible reusable UI elements, loading/error/empty states, and consistent Persian labels. Prefer clean practical interfaces over decoration.

## 7. Execution plan for Codex

**Step 0 — inspect:** `pwd`, list files, inspect `package.json`, `prisma` and git status. Tell the user whether this is a new/empty repo, an existing Next.js repo, or only attachments; identify missing prerequisites without falsely claiming anything is running. Never overwrite existing work silently.

**Step 1 — bootstrap:** scaffold Next.js 16/React 19/TS strict/Tailwind 4 (only if not already present); set up lint, TS checks, stable scripts, `.gitignore`, `.env.example`, docs and `AGENTS.md`. Use Node 24/npm. Set up Docker Compose local PostgreSQL 18; reserve Nginx for deployment.

**Step 2 — database:** integrate/create Prisma 7 schema/config and adapter; run `prisma validate` and `prisma generate`; start PostgreSQL only if Docker is available; generate an initial migration and apply safely; commit migration files. Seed demo workshop, model and operation metadata without credentials or personal records.

**Step 3 — secure core:** implement authenticated user context and authorization on all read/write endpoints/server actions; membership and workshop checks in one transaction where necessary. Protect against cross-workshop access. Provide a safe way to create the first owner; no known passwords in source.

**Step 4 — vertical slice:** implement order creation/list/detail, batch creation, assignment, production entry, review/approval and dashboard. Connect the UI to real database queries, not hardcoded production data.

**Step 5 — validation and tests:** TypeScript strict check, lint, production build, migration validation, unit/integration tests for quantity rules/permissions/approval; basic end-to-end happy-path where environment supports it. Show actual pass/fail; explain blocked items.

**Step 6 — handover:** provide a precise Windows PowerShell `README` for prerequisites, setup, DB start, migrations, seed, dev server, test and troubleshooting. State what is implemented versus only planned.

Work in small checkpoints; after each checkpoint show files created/changed, commands run, test results, next concrete step. Do NOT redesign the chosen tech stack, skip auth, implement payroll first, connect external APIs or deploy publicly without explicit authorization.

## 8. Windows developer commands (to document/verify, not blindly assume success)

```powershell
node -v
npm -v
git --version
docker --version
# After project is created and .env.example is copied/configured:
npm install
docker compose up -d
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

A Docker Desktop/WSL2 installation may still be needed. Do not tell user to run `docker compose down -v` on data-bearing environments. If tools are unavailable in the Codex execution environment, generate files and commands, and clearly report what could not be verified.

## 9. What to build now — immediate instruction

**Proceed with Steps 0–2, then deliver the first working vertical slice from Step 4 with necessary secure auth from Step 3.** Start by inspecting the repository. If there is no repository, scaffold the correct Next.js 16 project. Use the user-selected technologies and this document as the product/engineering source of truth. If a previous `kargahyar-mvp.zip` is supplied, treat it only as a reference: its older stack and insecure approval flow are not production-ready. Do not substitute a static demo for a functioning application.

**Final response expected from Codex:**
1. Repo/path and state found.
2. Exact files created/modified.
3. Database schema/migration and test status.
4. Local launch instructions and URL.
5. Security limitations/blockers, if any.
6. Next recommended implementation milestone.

---

### Official references
- Next.js installation: https://nextjs.org/docs/app/getting-started/installation
- Prisma ORM 7 configuration: https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference
- Prisma 7 PostgreSQL adapter: https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql
- Codex IDE: https://developers.openai.com/codex/ide
