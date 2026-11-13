import { Prisma, type Role } from "@/generated/prisma/client";
import { getDb } from "@/server/db";
import { calculateDailyKpis, dailyReportInput } from "./daily-report";

const reportRoles: Role[] = ["OWNER", "MANAGER", "SUPERVISOR", "ASSISTANT"];

export type ReportActor = { userId: string; workshopId: string };

const reportMembership = (actor: ReportActor) => ({
  ...actor,
  active: true,
  role: { in: reportRoles },
  user: { disabledAt: null },
});

export function listReportWorkshops(userId: string) {
  return getDb().membership.findMany({
    where: { userId, active: true, role: { in: reportRoles }, user: { disabledAt: null } },
    select: { workshop: { select: { id: true, name: true, timezone: true } } },
    orderBy: [{ workshop: { name: "asc" } }, { workshopId: "asc" }],
  });
}

export function listReportOrders(actor: ReportActor) {
  return getDb().productionOrder.findMany({
    where: {
      workshopId: actor.workshopId,
      workshop: { members: { some: reportMembership(actor) } },
    },
    select: {
      id: true,
      orderNumber: true,
      items: { select: { batches: { select: { id: true, code: true } } } },
    },
    orderBy: { orderNumber: "asc" },
  });
}

export async function submitDailyReport(actor: ReportActor, rawInput: unknown) {
  const parsed = dailyReportInput.safeParse(rawInput);
  if (!parsed.success) return { kind: "invalid", issues: parsed.error.flatten().fieldErrors } as const;

  const { scope, ...report } = parsed.data;
  const data = { ...report, ...scope, workshopId: actor.workshopId, submittedById: actor.userId };
  const db = getDb();
  const identity = {
    workshopId_submissionKey: { workshopId: actor.workshopId, submissionKey: report.submissionKey },
  };

  // A membership change and report write are serialized. The unique key also
  // protects parallel retries, including retries after a response was lost.
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const member = await tx.membership.findFirst({ where: reportMembership(actor), select: { role: true } });
        if (!member) return { kind: "forbidden" } as const;

        const order = await tx.productionOrder.findUnique({
          where: { workshopId_id: { workshopId: actor.workshopId, id: scope.orderId } },
          select: { id: true },
        });
        if (!order) return { kind: "invalid_scope" } as const;

        if (scope.batchId) {
          const batch = await tx.productionBatch.findUnique({
            where: { workshopId_orderId_id: { workshopId: actor.workshopId, orderId: scope.orderId, id: scope.batchId } },
            select: { id: true },
          });
          if (!batch) return { kind: "invalid_scope" } as const;
        }

        const existing = await tx.dailyProductionReport.findUnique({ where: identity });
        if (existing) {
          const matches = Object.entries(data).every(([field, value]) => {
            const savedValue = existing[field as keyof typeof data];
            return value instanceof Date
              ? savedValue instanceof Date && value.getTime() === savedValue.getTime()
              : savedValue === value;
          });
          if (!matches) return { kind: "conflict" } as const;
        }

        const saved = existing ?? await tx.dailyProductionReport.create({ data });
        return { kind: "saved", id: saved.id, status: saved.status, kpis: calculateDailyKpis(saved) } as const;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (attempt >= 3 || !(error instanceof Prisma.PrismaClientKnownRequestError)
        || !["P2002", "P2034"].includes(error.code)) throw error;
    }
  }
}
