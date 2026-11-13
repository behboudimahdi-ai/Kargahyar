import { randomUUID } from "node:crypto";

export function reportFixture(scope = randomUUID()) {
  return {
    submissionKey: randomUUID(),
    reportDate: "2024-02-29",
    scope,
    goodQty: "۸۲",
    defectiveQty: "٣",
    reworkQty: "2",
    downtimeMinutes: "20",
    downtimeReason: "  تعویض سوزن  ",
    presentCount: "7",
    scheduledCount: "8",
  };
}
