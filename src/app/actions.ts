"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { calculateDailyKpis, reportFields, type ReportField, type ReportValues } from "@/features/production/daily-report";
import { submitDailyReport } from "@/features/production/daily-report-service";
import { findSession, redeemAccessKey, revokeSession, sessionCookieName, sessionLifetimeSeconds } from "@/server/auth";

export async function signIn(_previous: string, form: FormData) {
  const key = form.get("accessKey");
  const token = typeof key === "string" ? await redeemAccessKey(key.trim()) : null;
  if (!token) return "کلید ورود نامعتبر یا مصرف شده است.";

  const jar = await cookies();
  await revokeSession(jar.get(sessionCookieName)?.value);
  jar.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionLifetimeSeconds,
    path: "/",
  });
  redirect("/");
}

export async function signOut() {
  const jar = await cookies();
  await revokeSession(jar.get(sessionCookieName)?.value);
  jar.delete(sessionCookieName);
  redirect("/");
}

export type ReportState = {
  values: ReportValues;
  errors?: Partial<Record<ReportField, string[]>>;
  message?: string;
  receipt?: { id: string; kpis: ReturnType<typeof calculateDailyKpis> };
};

export async function saveReport(_previous: ReportState, form: FormData): Promise<ReportState> {
  const values = Object.fromEntries(Object.keys(reportFields).map((field) => {
    const value = form.get(field);
    return [field, typeof value === "string" ? value : ""];
  })) as ReportValues;
  const jar = await cookies();
  const session = await findSession(jar.get(sessionCookieName)?.value);
  if (!session) redirect("/");

  const workshop = z.uuid().safeParse(form.get("workshopId"));
  if (!workshop.success) return { values, message: "کارگاه معتبر نیست." };

  const result = await submitDailyReport({ userId: session.userId, workshopId: workshop.data.toLowerCase() }, {
    ...values,
    submissionKey: form.get("submissionKey"),
  });

  switch (result.kind) {
    case "invalid":
      return { values, errors: result.issues, message: "مقادیر مشخص‌شده را بررسی کنید." };
    case "invalid_scope":
      return { values, errors: { scope: ["این سفارش یا بچ در کارگاه انتخاب‌شده معتبر نیست."] } };
    case "forbidden":
      return { values, message: "دسترسی ثبت گزارش برای این کارگاه وجود ندارد." };
    case "conflict":
      return { values, message: "این شناسه قبلاً برای گزارش دیگری استفاده شده است. فرم جدید باز کنید." };
    case "saved":
      return { values, receipt: { id: result.id, kpis: result.kpis } };
  }
}
