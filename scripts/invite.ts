import "dotenv/config";
import { z } from "zod";
import { issueAccessKeyHash } from "../src/server/auth";
import { getDb } from "../src/server/db";

const args = z.tuple([z.uuid(), z.email().transform((email) => email.toLowerCase())]).safeParse(process.argv.slice(2));
if (!args.success || !process.stdout.isTTY) {
  console.error("Run interactively: npm run auth:invite -- <workshop-uuid> <email>");
  process.exit(1);
}
const [workshopId, email] = args.data;
const { key, accessKeyHash } = issueAccessKeyHash();
const db = getDb();

try {
  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {},
      create: { email },
      select: { id: true, disabledAt: true },
    });
    if (user.disabledAt) throw new Error("Account is disabled");
    const member = await tx.membership.upsert({
      where: { workshopId_userId: { workshopId, userId: user.id } },
      update: {},
      create: { workshopId, userId: user.id, role: "OWNER" },
    });
    if (!member.active) throw new Error("Membership is inactive");
    await tx.user.update({ where: { id: user.id }, data: { accessKeyHash } });
  });
  console.log(key);
} finally {
  await db.$disconnect();
}
