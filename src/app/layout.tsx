import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "کارگاه‌یار | گزارش تولید" };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
