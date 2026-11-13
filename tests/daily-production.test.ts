import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { calculateDailyKpis, dailyReportInput } from "../src/features/production/daily-report";
import { reportFixture } from "./report-fixture";

test("parses date-only, Persian and Arabic digits, and order or batch scope", () => {
  const orderId = randomUUID();
  const batchId = randomUUID();
  const order = dailyReportInput.parse(reportFixture(orderId));
  const batch = dailyReportInput.parse(reportFixture(`${orderId}/${batchId}`));
  assert.equal(order.reportDate.toISOString(), "2024-02-29T00:00:00.000Z");
  assert.equal(order.goodQty, 82);
  assert.equal(order.defectiveQty, 3);
  assert.equal(order.downtimeReason, "تعویض سوزن");
  assert.deepEqual(order.scope, { orderId, batchId: null });
  assert.deepEqual(batch.scope, { orderId, batchId });
});

test("rejects invalid dates, numbers, scope and mismatched related fields", () => {
  const base = reportFixture();
  for (const [field, value] of [
    ["reportDate", "2025-02-29"], ["reportDate", "0000-01-01"], ["scope", "unlisted"],
    ["scope", `${base.scope}/${randomUUID()}/${randomUUID()}`], ["submissionKey", ""],
    ["goodQty", "-1"], ["goodQty", "1.2"], ["goodQty", "1e2"], ["goodQty", "2147483648"],
    ["defectiveQty", ""], ["reworkQty", "4"], ["presentCount", "9"],
    ["downtimeMinutes", "1441"], ["downtimeMinutes", "0"],
    ["downtimeReason", "   "], ["downtimeReason", "الف".repeat(501)],
  ]) {
    assert.equal(dailyReportInput.safeParse({ ...base, [field]: value }).success, false, `${field}=${value}`);
  }
});

test("rounds KPIs and counts rework only as a defective subset", () => {
  assert.deepEqual(calculateDailyKpis(dailyReportInput.parse(reportFixture())), {
    totalQty: 85, goodRate: 96.47, defectRate: 3.53, reworkRate: 2.35, attendanceRate: 87.5, downtimeMinutes: 20,
  });
});

test("represents missing denominators as null and allows zero activity", () => {
  const report = dailyReportInput.parse({
    ...reportFixture(), goodQty: "0", defectiveQty: "0", reworkQty: "0",
    downtimeMinutes: "0", downtimeReason: "", presentCount: "0", scheduledCount: "0",
  });
  assert.equal(report.downtimeReason, null);
  assert.deepEqual(calculateDailyKpis(report), {
    totalQty: 0, goodRate: null, defectRate: null, reworkRate: null, attendanceRate: null, downtimeMinutes: 0,
  });
});
