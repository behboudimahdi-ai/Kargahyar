import { z } from "zod";

export const reportFields = {
  reportDate: "تاریخ گزارش",
  scope: "سفارش یا بچ",
  goodQty: "تعداد سالم",
  defectiveQty: "تعداد معیوب",
  reworkQty: "تعداد نیازمند دوباره‌کاری",
  downtimeMinutes: "مدت توقف خط (دقیقه)",
  downtimeReason: "علت توقف",
  presentCount: "تعداد حاضر",
  scheduledCount: "تعداد برنامه‌ریزی‌شده",
} as const;

export type ReportField = keyof typeof reportFields;
export type ReportValues = Record<ReportField, string>;

export const emptyReportValues: ReportValues = {
  reportDate: "",
  scope: "",
  goodQty: "",
  defectiveQty: "",
  reworkQty: "0",
  downtimeMinutes: "0",
  downtimeReason: "",
  presentCount: "",
  scheduledCount: "",
};

const digitMap = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";
function normalizeDigits(value: string) {
  return value.trim().replace(/[۰-۹٠-٩]/g, (digit) => String(digitMap.indexOf(digit) % 10));
}

const maxInteger = 2_147_483_647;
function wholeNumber(max = maxInteger) {
  return z.string().transform(normalizeDigits)
    .pipe(z.string().regex(/^\d+$/, "یک عدد صحیح نامنفی وارد کنید."))
    .transform(Number)
    .pipe(z.number().int().max(max, `حداکثر مقدار ${max} است.`));
}

const uuid = z.uuid("شناسه معتبر نیست.").transform((value) => value.toLowerCase());

export const dailyReportInput = z.object({
  submissionKey: uuid,
  reportDate: z.string().transform(normalizeDigits)
    .pipe(z.iso.date("تاریخ میلادی معتبر وارد کنید."))
    .refine((value) => !value.startsWith("0000-"), "تاریخ میلادی معتبر وارد کنید.")
    .transform((value) => new Date(`${value}T00:00:00.000Z`)),
  scope: z.string().transform((value) => value.split("/"))
    .pipe(z.array(uuid).min(1, "سفارش یا بچ معتبر انتخاب کنید.")
      .max(2, "سفارش یا بچ معتبر انتخاب کنید."))
    .transform(([orderId, batchId]) => ({ orderId, batchId: batchId ?? null })),
  goodQty: wholeNumber(),
  defectiveQty: wholeNumber(),
  reworkQty: wholeNumber(),
  downtimeMinutes: wholeNumber(1440),
  downtimeReason: z.string().trim().max(500, "علت توقف باید حداکثر ۵۰۰ نویسه باشد.")
    .transform((value) => value || null),
  presentCount: wholeNumber(),
  scheduledCount: wholeNumber(),
}).superRefine((value, ctx) => {
  if (value.reworkQty > value.defectiveQty) {
    ctx.addIssue({ code: "custom", path: ["reworkQty"], message: "دوباره‌کاری نمی‌تواند بیشتر از تعداد معیوب باشد." });
  }
  if (value.presentCount > value.scheduledCount) {
    ctx.addIssue({ code: "custom", path: ["presentCount"], message: "تعداد حاضر نمی‌تواند بیشتر از تعداد برنامه‌ریزی‌شده باشد." });
  }
  if (value.downtimeMinutes > 0 && !value.downtimeReason) {
    ctx.addIssue({ code: "custom", path: ["downtimeReason"], message: "علت توقف را وارد کنید." });
  }
  if (value.downtimeMinutes === 0 && value.downtimeReason) {
    ctx.addIssue({ code: "custom", path: ["downtimeReason"], message: "برای ثبت علت توقف، مدت توقف را وارد کنید." });
  }
});

export function calculateDailyKpis(report: Pick<
  z.output<typeof dailyReportInput>,
  "goodQty" | "defectiveQty" | "reworkQty" | "downtimeMinutes" | "presentCount" | "scheduledCount"
>) {
  const totalQty = report.goodQty + report.defectiveQty;
  // Integer arithmetic gives stable rounding to two decimal places.
  const rate = (numerator: number, denominator: number) =>
    denominator === 0 ? null : Math.floor((numerator * 10_000 + denominator / 2) / denominator) / 100;

  return {
    totalQty,
    goodRate: rate(report.goodQty, totalQty),
    defectRate: rate(report.defectiveQty, totalQty),
    reworkRate: rate(report.reworkQty, totalQty),
    attendanceRate: rate(report.presentCount, report.scheduledCount),
    downtimeMinutes: report.downtimeMinutes,
  };
}
