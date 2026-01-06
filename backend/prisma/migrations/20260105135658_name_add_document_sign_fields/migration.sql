-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "signedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
