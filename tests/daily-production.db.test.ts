import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { getDb } from "../src/server/db";
import { findSession, issueAccessKeyHash, redeemAccessKey, revokeSession } from "../src/server/auth";
import { listReportOrders, submitDailyReport } from "../src/features/production/daily-report-service";
import { reportFixture } from "./report-fixture";

// Integration tests only use a dedicated, migrated PostgreSQL test database.
if (!process.env.TEST_DATABASE_URL) throw new Error("Set TEST_DATABASE_URL to a dedicated migrated test database");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = getDb();
const actor = { userId: randomUUID(), workshopId: randomUUID() };
const viewerId = randomUUID();
const otherWorkshopId = randomUUID();
const orderId = randomUUID();
const batchId = randomUUID();
const otherOrderId = randomUUID();
const sameWorkshopOtherOrderId = randomUUID();

before(async () => {
  await db.$transaction(async (tx) => {
    await tx.workshop.createMany({ data: [
      { id: actor.workshopId, name: "Test workshop" }, { id: otherWorkshopId, name: "Other workshop" },
    ] });
    await tx.user.createMany({ data: [actor.userId, viewerId].map((id) => ({ id, email: `${id}@example.test` })) });
    await tx.membership.createMany({ data: [
      { ...actor, role: "SUPERVISOR" },
      { workshopId: actor.workshopId, userId: viewerId, role: "VIEWER" },
    ] });
    await tx.productionOrder.createMany({ data: [
      { id: orderId, workshopId: actor.workshopId, orderNumber: "TEST-1" },
      { id: sameWorkshopOtherOrderId, workshopId: actor.workshopId, orderNumber: "TEST-2" },
      { id: otherOrderId, workshopId: otherWorkshopId, orderNumber: "TEST-1" },
    ] });
    const product = await tx.productModel.create({ data: { workshopId: actor.workshopId, code: "TEST", name: "Test" } });
    const item = await tx.orderItem.create({
      data: { workshopId: actor.workshopId, orderId, productId: product.id, quantity: 200 },
    });
    await tx.productionBatch.create({
      data: { id: batchId, workshopId: actor.workshopId, orderId, orderItemId: item.id, code: "TEST-BATCH", plannedQty: 200 },
    });
  });
});

after(async () => db.$disconnect());

test("stores a pending report and safely handles concurrent retries and changed payloads", async () => {
  const input = reportFixture(`${orderId}/${batchId}`);
  const [first, retry] = await Promise.all([submitDailyReport(actor, input), submitDailyReport(actor, input)]);
  assert.equal(first.kind, "saved");
  assert.deepEqual(first, retry);
  assert.equal(first.status, "PENDING");
  assert.equal(first.kpis.totalQty, 85);
  const saved = await db.dailyProductionReport.findMany({ where: { workshopId: actor.workshopId, submissionKey: input.submissionKey } });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].reportDate.toISOString(), "2024-02-29T00:00:00.000Z");
  assert.equal(saved[0].downtimeReason, "تعویض سوزن");
  assert.equal(saved[0].submittedById, actor.userId);
  assert.equal((await submitDailyReport(actor, { ...input, goodQty: "83" })).kind, "conflict");
  assert.equal((await submitDailyReport(actor, reportFixture(orderId))).kind, "saved");
});

test("rejects unauthorized actors and foreign order/batch pairs", async () => {
  assert.equal((await listReportOrders({ ...actor, userId: viewerId })).length, 0);
  assert.equal((await submitDailyReport({ ...actor, userId: viewerId }, reportFixture(orderId))).kind, "forbidden");
  assert.equal((await submitDailyReport({ ...actor, workshopId: otherWorkshopId }, reportFixture(otherOrderId))).kind, "forbidden");
  assert.equal((await submitDailyReport(actor, reportFixture(otherOrderId))).kind, "invalid_scope");
  assert.equal((await submitDailyReport(actor, reportFixture(`${sameWorkshopOtherOrderId}/${batchId}`))).kind, "invalid_scope");
});

test("PostgreSQL enforces quantity, attendance, downtime, and tenant/order constraints", async () => {
  const base = {
    workshopId: actor.workshopId, orderId, batchId, submittedById: actor.userId,
    reportDate: new Date("2024-02-29"), goodQty: 2, defectiveQty: 1, reworkQty: 1,
    presentCount: 1, scheduledCount: 1, downtimeMinutes: 0,
  };
  for (const override of [
    { goodQty: -1 }, { reworkQty: 2 }, { presentCount: 2 }, { downtimeMinutes: 1 },
    { downtimeReason: "unexpected" }, { orderId: sameWorkshopOtherOrderId }, { orderId: otherOrderId, batchId: null },
  ]) {
    await assert.rejects(db.dailyProductionReport.create({ data: { ...base, ...override, submissionKey: randomUUID() } }));
  }
});

test("a sign-in key is consumed atomically and its session can be revoked", async () => {
  const { key, accessKeyHash } = issueAccessKeyHash();
  await db.user.update({ where: { id: actor.userId }, data: { accessKeyHash } });
  const results = await Promise.all([redeemAccessKey(key), redeemAccessKey(key)]);
  const tokens = results.filter((token) => token !== null);
  assert.equal(tokens.length, 1);
  assert.deepEqual(await findSession(tokens[0]), { userId: actor.userId });
  await revokeSession(tokens[0]);
  assert.equal(await findSession(tokens[0]), null);
});
