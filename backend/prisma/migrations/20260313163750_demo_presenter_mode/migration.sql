/*
  Warnings:

  - A unique constraint covering the columns `[presenterUserId]` on the table `DemoDisplay` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DemoDisplay" ADD COLUMN     "demoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastViewerActivityAt" TIMESTAMP(3),
ADD COLUMN     "presenterUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DemoDisplay_presenterUserId_key" ON "DemoDisplay"("presenterUserId");

-- CreateIndex
CREATE INDEX "DemoDisplay_isActive_demoEnabled_idx" ON "DemoDisplay"("isActive", "demoEnabled");

-- CreateIndex
CREATE INDEX "DemoDisplay_presenterUserId_idx" ON "DemoDisplay"("presenterUserId");

-- AddForeignKey
ALTER TABLE "DemoDisplay" ADD CONSTRAINT "DemoDisplay_presenterUserId_fkey" FOREIGN KEY ("presenterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
