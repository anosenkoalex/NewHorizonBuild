-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "layoutVariantId" TEXT;

-- CreateTable
CREATE TABLE "UnitPlanVariant" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "planImageUrl" TEXT,
    "description" TEXT,
    "area" DOUBLE PRECISION,
    "rooms" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitPlanVariant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UnitPlanVariant" ADD CONSTRAINT "UnitPlanVariant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_layoutVariantId_fkey" FOREIGN KEY ("layoutVariantId") REFERENCES "UnitPlanVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
