/*
  Warnings:

  - You are about to drop the column `displayKey` on the `DemoDisplay` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `DemoDisplay` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `DemoDisplay` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `DemoDisplay` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DemoDisplay" DROP CONSTRAINT "DemoDisplay_projectId_fkey";

-- DropIndex
DROP INDEX "DemoDisplay_displayKey_key";

-- AlterTable
ALTER TABLE "DemoDisplay" DROP COLUMN "displayKey",
DROP COLUMN "projectId",
ADD COLUMN     "autoplayDelaySec" INTEGER,
ADD COLUMN     "autoplayEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoplayProjectId" TEXT,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "currentProjectId" TEXT,
ADD COLUMN     "currentUnitId" TEXT,
ADD COLUMN     "lastPingAt" TIMESTAMP(3),
ADD COLUMN     "office" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DemoDisplay_code_key" ON "DemoDisplay"("code");

-- AddForeignKey
ALTER TABLE "DemoDisplay" ADD CONSTRAINT "DemoDisplay_currentProjectId_fkey" FOREIGN KEY ("currentProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoDisplay" ADD CONSTRAINT "DemoDisplay_currentUnitId_fkey" FOREIGN KEY ("currentUnitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoDisplay" ADD CONSTRAINT "DemoDisplay_autoplayProjectId_fkey" FOREIGN KEY ("autoplayProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
