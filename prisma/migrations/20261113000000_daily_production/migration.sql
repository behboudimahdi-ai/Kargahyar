-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'SUPERVISOR', 'ASSISTANT', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "DailyReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Workshop" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tehran',

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "disabledAt" TIMESTAMPTZ(3),
    "accessKeyHash" CHAR(64),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "tokenHash" CHAR(64) NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "Membership" (
    "workshopId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("workshopId","userId")
);

-- CreateTable
CREATE TABLE "ProductModel" (
    "id" UUID NOT NULL,
    "workshopId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" UUID NOT NULL,
    "workshopId" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "workshopId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" UUID NOT NULL,
    "workshopId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "plannedQty" INTEGER NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyProductionReport" (
    "id" UUID NOT NULL,
    "workshopId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "batchId" UUID,
    "submittedById" UUID NOT NULL,
    "submissionKey" UUID NOT NULL,
    "reportDate" DATE NOT NULL,
    "goodQty" INTEGER NOT NULL,
    "defectiveQty" INTEGER NOT NULL,
    "reworkQty" INTEGER NOT NULL,
    "downtimeMinutes" INTEGER NOT NULL,
    "downtimeReason" VARCHAR(500),
    "presentCount" INTEGER NOT NULL,
    "scheduledCount" INTEGER NOT NULL,
    "status" "DailyReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyProductionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_accessKeyHash_key" ON "User"("accessKeyHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "Membership_userId_active_idx" ON "Membership"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModel_workshopId_id_key" ON "ProductModel"("workshopId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModel_workshopId_code_key" ON "ProductModel"("workshopId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_workshopId_id_key" ON "ProductionOrder"("workshopId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_workshopId_orderNumber_key" ON "ProductionOrder"("workshopId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_workshopId_orderId_id_key" ON "OrderItem"("workshopId", "orderId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_workshopId_orderId_id_key" ON "ProductionBatch"("workshopId", "orderId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_workshopId_code_key" ON "ProductionBatch"("workshopId", "code");

-- CreateIndex
CREATE INDEX "DailyProductionReport_workshopId_reportDate_status_idx" ON "DailyProductionReport"("workshopId", "reportDate", "status");

-- CreateIndex
CREATE INDEX "DailyProductionReport_workshopId_orderId_batchId_idx" ON "DailyProductionReport"("workshopId", "orderId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyProductionReport_workshopId_submissionKey_key" ON "DailyProductionReport"("workshopId", "submissionKey");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModel" ADD CONSTRAINT "ProductModel_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_workshopId_orderId_fkey" FOREIGN KEY ("workshopId", "orderId") REFERENCES "ProductionOrder"("workshopId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_workshopId_productId_fkey" FOREIGN KEY ("workshopId", "productId") REFERENCES "ProductModel"("workshopId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_workshopId_orderId_orderItemId_fkey" FOREIGN KEY ("workshopId", "orderId", "orderItemId") REFERENCES "OrderItem"("workshopId", "orderId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProductionReport" ADD CONSTRAINT "DailyProductionReport_workshopId_orderId_fkey" FOREIGN KEY ("workshopId", "orderId") REFERENCES "ProductionOrder"("workshopId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DailyProductionReport" ADD CONSTRAINT "DailyProductionReport_workshopId_orderId_batchId_fkey" FOREIGN KEY ("workshopId", "orderId", "batchId") REFERENCES "ProductionBatch"("workshopId", "orderId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DailyProductionReport" ADD CONSTRAINT "DailyProductionReport_workshopId_submittedById_fkey" FOREIGN KEY ("workshopId", "submittedById") REFERENCES "Membership"("workshopId", "userId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Domain rules enforced for all writes, including outside Prisma.
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_plannedQty_positive" CHECK ("plannedQty" > 0);
ALTER TABLE "DailyProductionReport"
    ADD CONSTRAINT "DailyProductionReport_quantities_valid"
        CHECK ("goodQty" >= 0 AND "defectiveQty" >= 0 AND "reworkQty" BETWEEN 0 AND "defectiveQty"),
    ADD CONSTRAINT "DailyProductionReport_attendance_valid"
        CHECK ("scheduledCount" >= 0 AND "presentCount" BETWEEN 0 AND "scheduledCount"),
    ADD CONSTRAINT "DailyProductionReport_downtime_valid"
        CHECK (
            ("downtimeMinutes" = 0 AND "downtimeReason" IS NULL)
            OR ("downtimeMinutes" BETWEEN 1 AND 1440 AND "downtimeReason" IS NOT NULL
                AND "downtimeReason" ~ '[^[:space:]]')
        );
