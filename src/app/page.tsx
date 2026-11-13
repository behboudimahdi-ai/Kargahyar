import { randomUUID } from "node:crypto";
import { ClipboardList } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { listReportOrders, listReportWorkshops } from "@/features/production/daily-report-service";
import { findSession, sessionCookieName } from "@/server/auth";
import { signOut } from "./actions";
import { ReportForm, SignInForm } from "./forms";

export default async function Page({ searchParams }: { searchParams: Promise<{ workshop?: string }> }) {
  const jar = await cookies();
  const session = await findSession(jar.get(sessionCookieName)?.value);
  const workshops = session ? await listReportWorkshops(session.userId) : [];
  const { workshop: selected } = await searchParams;
  const workshop = workshops.find((item) => item.workshop.id === selected)?.workshop ?? workshops[0]?.workshop;
  const orders = session && workshop ? await listReportOrders({ userId: session.userId, workshopId: workshop.id }) : [];
  const options = orders.flatMap((order) => [
    { value: order.id, label: order.orderNumber },
    ...order.items.flatMap((item) => item.batches)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((batch) => ({ value: `${order.id}/${batch.id}`, label: `${order.orderNumber} / ${batch.code}` })),
  ]);

  return <main className="mx-auto max-w-3xl p-4 sm:p-8">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <ClipboardList aria-hidden="true" className="size-7 text-emerald-800" />
        <h1 className="text-2xl font-bold">گزارش روزانهٔ تولید</h1>
      </div>
      {session && <form action={signOut}><button className="text-emerald-900 underline">خروج</button></form>}
    </header>
    <div className="rounded-xl border border-emerald-100 bg-white p-5 sm:p-7">
      {!session && <SignInForm />}
      {session && !workshop && <p>دسترسی ثبت گزارش برای حساب شما فعال نیست.</p>}
      {workshop && <h2 className="mb-4 text-lg font-bold">{workshop.name}</h2>}
      {workshops.length > 1 && <nav aria-label="انتخاب کارگاه" className="mb-5 flex flex-wrap gap-3">
        {workshops.map(({ workshop: item }) => <Link key={item.id} href={`/?workshop=${item.id}`}
          aria-current={item.id === workshop?.id ? "page" : undefined}
          className="rounded-lg border border-emerald-300 px-3 py-1.5 aria-[current=page]:bg-emerald-100">{item.name}</Link>)}
      </nav>}
      {workshop && options.length === 0 && <p>برای ثبت گزارش، ابتدا یک سفارش ایجاد کنید.</p>}
      {workshop && options.length > 0 && <ReportForm key={workshop.id} workshopId={workshop.id}
        submissionKey={randomUUID()} options={options}
        today={new Intl.DateTimeFormat("en-CA", {
          timeZone: workshop.timezone, year: "numeric", month: "2-digit", day: "2-digit",
        }).format(new Date())} />}
    </div>
  </main>;
}
