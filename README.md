# کارگاه‌یار

## راه‌اندازی محلی در Windows PowerShell

پیش‌نیازها Node.js 24، npm و Docker Desktop هستند. یک نسخه از `.env.example` بسازید و در فایل محلی `.env`، رمز تازه برای `POSTGRES_PASSWORD` و نشانی اتصال همان پایگاه داده برای `DATABASE_URL` وارد کنید. قالب نشانی `postgresql://kargahyar:<encoded-password>@127.0.0.1:5432/kargahyar` است. نویسه‌های ویژهٔ رمز در نشانی باید URL-encode شوند.

```powershell
Copy-Item .env.example .env
# Edit .env before continuing.
npm.cmd ci
docker compose up -d --wait
npm.cmd run db:validate
npm.cmd run db:migrate
npm.cmd run db:generate
$workshop = npm.cmd --silent run db:demo | Select-Object -Last 1
npm.cmd run auth:invite -- $workshop owner@example.test
npm.cmd run dev
```

در [صفحهٔ محلی](http://localhost:3000) کلید یک‌بارمصرفِ نمایش‌داده‌شده در ترمینال را وارد کنید. برای ورود دوباره پس از خروج یا انقضای نشست، دستور دعوت را در ترمینال تعاملی تکرار کنید. کلید در پایگاه داده به‌صورت هش نگه‌داری می‌شود. سفارش و بچ این راهنما نمونهٔ آزمایشی‌اند.

## ثبت گزارش

- تاریخ ورودی میلادی است و تاریخ پیشنهادی از منطقهٔ زمانی کارگاه گرفته می‌شود. هر گزارش به یک سفارش یا بچ همان سفارش در همان کارگاه تعلق دارد.
- سالم و معیوب دو دستهٔ مجزا از واحدهای بررسی‌شده‌اند. تعداد نیازمند دوباره‌کاری زیرمجموعهٔ معیوب است. نرخ هر سه از تقسیم تعداد بر مجموع سالم و معیوب به دست می‌آید. نرخ حضور برابر حاضر تقسیم بر تعداد برنامه‌ریزی‌شده است. نرخ‌ها با دو رقم اعشار محاسبه می‌شوند و مخرج صفر به‌صورت «—» نمایش داده می‌شود.
- مدت توقف به دقیقه ثبت می‌شود و برای مدت مثبت علت اجباری است. در این مرحله حضور و توقف در سطح همان گزارش وارد می‌شوند. برای جمع‌بندی روزانهٔ کارگاه باید از دوباره‌شماری حضور یا توقف مشترک بین گزارش‌های چند بچ و نیز همپوشانی گزارش سفارش و بچ جلوگیری کرد.
- گزارش با وضعیت «در انتظار بررسی» ثبت می‌شود و رسید فقط KPI همان گزارش را نشان می‌دهد. جمع‌بندی رسمی بعد از افزودن گردش تأیید و تعریف شمارش محصول نهایی پیاده‌سازی می‌شود.

## تست

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

برای تست یکپارچه، یک پایگاه دادهٔ آزمایشی جداگانه بسازید. تست‌ها رکورد آزمایشی تولید می‌کنند.

```powershell
$env:TEST_DATABASE_URL = '<dedicated-postgresql-test-url>'
$savedDatabaseUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = $env:TEST_DATABASE_URL
  npm.cmd run db:migrate
  if ($LASTEXITCODE -ne 0) { throw 'Test database migration failed' }
  npm.cmd run test:db
} finally {
  $env:DATABASE_URL = $savedDatabaseUrl
}
```

اجرای پیش‌فرض برنامه روی loopback است. ورود با کلید یک‌بارمصرف برای شروع توسعه محلی فراهم است. برای دسترسی عملیاتی، چرخهٔ مدیریت حساب و دسترسی، HTTPS و گردش تأیید گزارش باید تکمیل شوند.
