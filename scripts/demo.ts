import "dotenv/config";
import { getDb } from "../src/server/db";

const workshopId = "b227489f-bf5c-4ad6-93b4-2487a087d6d6";
const itemId = "a520f28a-1e45-4d13-835b-99dc9b6949b5";
const db = getDb();

try {
  await db.$transaction(async (tx) => {
    await tx.workshop.upsert({ where: { id: workshopId }, update: {}, create: { id: workshopId, name: "کارگاه آزمایشی" } });
    const product = await tx.productModel.upsert({
      where: { workshopId_code: { workshopId, code: "DEMO-SHOMIZ" } },
      update: {},
      create: { workshopId, code: "DEMO-SHOMIZ", name: "شومیز آزمایشی" },
    });
    const order = await tx.productionOrder.upsert({
      where: { workshopId_orderNumber: { workshopId, orderNumber: "ORD-DEMO-001" } },
      update: {},
      create: { workshopId, orderNumber: "ORD-DEMO-001" },
    });
    await tx.orderItem.upsert({
      where: { id: itemId },
      update: {},
      create: { id: itemId, workshopId, orderId: order.id, productId: product.id, quantity: 200 },
    });
    await tx.productionBatch.upsert({
      where: { workshopId_code: { workshopId, code: "BATCH-DEMO-001" } },
      update: {},
      create: { workshopId, orderId: order.id, orderItemId: itemId, code: "BATCH-DEMO-001", plannedQty: 200 },
    });
  });
  console.log(workshopId);
} finally {
  await db.$disconnect();
}
