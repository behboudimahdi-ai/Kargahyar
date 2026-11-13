import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
export const sessionLifetimeSeconds = 8 * 60 * 60;
export const sessionCookieName = process.env.NODE_ENV === "production" ? "__Host-kargahyar" : "kargahyar";

export function newToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function issueAccessKeyHash() {
  const key = newToken();
  return { key, accessKeyHash: hashToken(key) };
}

export async function redeemAccessKey(key: string) {
  if (!tokenPattern.test(key)) return null;

  const accessKeyHash = hashToken(key);
  const token = newToken();
  const db = getDb();
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { accessKeyHash, disabledAt: null }, select: { id: true } });
    if (!user) return null;

    const { count } = await tx.user.updateMany({
      where: { id: user.id, accessKeyHash, disabledAt: null },
      data: { accessKeyHash: null },
    });
    if (count !== 1) return null;

    await tx.authSession.create({
      data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + sessionLifetimeSeconds * 1000) },
    });
    return token;
  });
}

export async function findSession(token: string | undefined) {
  if (!token || !tokenPattern.test(token)) return null;

  return getDb().authSession.findUnique({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() }, user: { disabledAt: null } },
    select: { userId: true },
  });
}

export async function revokeSession(token: string | undefined) {
  if (token && tokenPattern.test(token)) {
    await getDb().authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
}
