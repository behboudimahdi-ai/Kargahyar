"use client";

import { useActionState } from "react";
import { emptyReportValues, reportFields, type ReportField } from "@/features/production/daily-report";
import { saveReport, signIn, type ReportState } from "./actions";

const primary = "rounded-lg bg-emerald-800 px-5 py-2.5 text-white hover:bg-emerald-900 disabled:opacity-60";

export function SignInForm() {
  const [error, action, pending] = useActionState(signIn, "");
  return <form action={action} className="grid gap-4">
    <label className="grid gap-1.5">
      کلید یک‌بارمصرف ورود
      <input type="password" name="accessKey" dir="ltr" required autoComplete="off" maxLength={43} />
    </label>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    <button className={primary} disabled={pending}>{pending ? "در حال ورود…" : "ورود"}</button>
  </form>;
}

type ScopeOption = { value: string; label: string };

export function ReportForm({ workshopId, submissionKey, today, options }: {
  workshopId: string;
  submissionKey: string;
  today: string;
  options: ScopeOption[];
}) {
  const [state, action, pending] = useActionState<ReportState, FormData>(
    saveReport,
    { values: { ...emptyReportValues, reportDate: today } },
  );

  if (state.receipt) {
    const { id, kpis } = state.receipt;
    const format = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
    const percent = (value: number | null) => value === null ? "—" : `${format.format(value)}٪`;
    const rows = [
      ["کل واحدهای بررسی‌شده", format.format(kpis.totalQty)],
      ["نرخ سالم", percent(kpis.goodRate)],
      ["نرخ معیوب", percent(kpis.defectRate)],
      ["نرخ نیاز به دوباره‌کاری", percent(kpis.reworkRate)],
      ["نرخ حضور", percent(kpis.attendanceRate)],
      ["دقایق توقف خط", format.format(kpis.downtimeMinutes)],
    ];
    return <section className="grid gap-4" aria-live="polite">
      <h2 className="text-lg font-bold">گزارش ثبت شد و در صف بررسی است</h2>
      <p className="text-sm">شناسهٔ گزارش <bdi>{id}</bdi></p>
      <dl className="grid gap-2">
        {rows.map(([name, value]) => <div key={name} className="flex justify-between gap-4 border-b border-emerald-100 pb-2">
          <dt>{name}</dt><dd>{value}</dd>
        </div>)}
      </dl>
      <a href={`/?workshop=${workshopId}`} className="w-fit text-emerald-800 underline">ثبت گزارش دیگر</a>
    </section>;
  }

  const errors = state.errors;
  const fieldError = (name: ReportField) => errors?.[name]?.length
    ? <span id={`${name}-error`} className="text-sm text-red-800">{errors[name].join(" ")}</span>
    : null;
  const input = (name: ReportField, type = "text") => <label className="grid gap-1.5">
    {reportFields[name]}
    <input name={name} type={type} inputMode={type === "text" ? "numeric" : undefined} dir="ltr"
      defaultValue={state.values[name]} required
      aria-invalid={!!errors?.[name]} aria-describedby={errors?.[name] ? `${name}-error` : undefined} />
    {fieldError(name)}
  </label>;

  return <form action={action} className="grid gap-5">
    <input type="hidden" name="workshopId" value={workshopId} />
    <input type="hidden" name="submissionKey" value={submissionKey} />
    <div className="grid gap-4 sm:grid-cols-2">
      {input("reportDate", "date")}
      <label className="grid gap-1.5">
        {reportFields.scope}
        <select name="scope" defaultValue={state.values.scope} required
          aria-invalid={!!errors?.scope} aria-describedby={errors?.scope ? "scope-error" : undefined}>
          <option value="">انتخاب کنید</option>
          {options.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
        {fieldError("scope")}
      </label>
      {input("goodQty")}
      {input("defectiveQty")}
      {input("reworkQty")}
      {input("downtimeMinutes")}
      {input("presentCount")}
      {input("scheduledCount")}
    </div>
    <label className="grid gap-1.5">
      {reportFields.downtimeReason}
      <textarea name="downtimeReason" rows={2} maxLength={500} defaultValue={state.values.downtimeReason}
        aria-invalid={!!errors?.downtimeReason} aria-describedby={errors?.downtimeReason ? "downtimeReason-error" : undefined} />
      {fieldError("downtimeReason")}
    </label>
    {state.message && <p role="alert" className="text-red-800">{state.message}</p>}
    <button className={`${primary} w-fit`} disabled={pending}>{pending ? "در حال ثبت…" : "ثبت برای بررسی"}</button>
  </form>;
}
