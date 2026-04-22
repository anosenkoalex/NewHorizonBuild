-- CreateEnum
CREATE TYPE "AssetFileKind" AS ENUM ('SOURCE_3D', 'CONVERTED_3D', 'PREVIEW_IMAGE', 'PLAN_IMAGE', 'TEXTURE', 'MATERIAL', 'ARCHIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "Project3DAssetStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'FAILED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ImportJobType" AS ENUM ('MODEL_UPLOAD', 'MODEL_PARSE', 'MODEL_CONVERT', 'MODEL_NORMALIZE', 'MODEL_PREVIEW_RENDER', 'UNITS_IMPORT', 'PLANS_IMPORT');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "Project3DBindingTargetType" AS ENUM ('PROJECT', 'BUILDING', 'SECTION', 'FLOOR', 'UNIT');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "published3DAssetId" TEXT,
ADD COLUMN     "publishedCameraPresetId" TEXT,
ADD COLUMN     "publishedScenePresetId" TEXT;

-- CreateTable
CREATE TABLE "AssetFile" (
    "id" TEXT NOT NULL,
    "kind" "AssetFileKind" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "extension" TEXT,
    "sizeBytes" INTEGER,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT,
    "checksum" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project3DAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "versionLabel" TEXT,
    "sourceFormat" TEXT,
    "outputFormat" TEXT,
    "status" "Project3DAssetStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceFileId" TEXT,
    "outputFileId" TEXT,
    "previewFileId" TEXT,
    "normalizationJson" JSONB,
    "diagnosticsJson" JSONB,
    "notes" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project3DAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project3DScenePreset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "backgroundColor" TEXT,
    "lightingJson" JSONB,
    "statusColorsJson" JSONB,
    "filtersJson" JSONB,
    "autoplayJson" JSONB,
    "uiLayoutJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project3DScenePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project3DCameraPreset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scenePresetId" TEXT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "positionJson" JSONB NOT NULL,
    "targetJson" JSONB NOT NULL,
    "zoom" DOUBLE PRECISION,
    "fov" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project3DCameraPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "type" "ImportJobType" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "projectId" TEXT,
    "project3DAssetId" TEXT,
    "payloadJson" JSONB,
    "resultJson" JSONB,
    "errorText" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project3DBinding" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "targetType" "Project3DBindingTargetType" NOT NULL,
    "buildingId" TEXT,
    "sectionId" TEXT,
    "floorId" TEXT,
    "unitId" TEXT,
    "nodeKey" TEXT NOT NULL,
    "nodeName" TEXT,
    "nodePath" TEXT,
    "groupName" TEXT,
    "materialName" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project3DBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetFile_kind_idx" ON "AssetFile"("kind");

-- CreateIndex
CREATE INDEX "AssetFile_checksum_idx" ON "AssetFile"("checksum");

-- CreateIndex
CREATE INDEX "Project3DAsset_projectId_idx" ON "Project3DAsset"("projectId");

-- CreateIndex
CREATE INDEX "Project3DAsset_projectId_status_idx" ON "Project3DAsset"("projectId", "status");

-- CreateIndex
CREATE INDEX "Project3DAsset_projectId_isPublished_idx" ON "Project3DAsset"("projectId", "isPublished");

-- CreateIndex
CREATE INDEX "Project3DAsset_sourceFileId_idx" ON "Project3DAsset"("sourceFileId");

-- CreateIndex
CREATE INDEX "Project3DAsset_outputFileId_idx" ON "Project3DAsset"("outputFileId");

-- CreateIndex
CREATE INDEX "Project3DAsset_previewFileId_idx" ON "Project3DAsset"("previewFileId");

-- CreateIndex
CREATE INDEX "Project3DScenePreset_projectId_idx" ON "Project3DScenePreset"("projectId");

-- CreateIndex
CREATE INDEX "Project3DScenePreset_projectId_isDefault_idx" ON "Project3DScenePreset"("projectId", "isDefault");

-- CreateIndex
CREATE INDEX "Project3DScenePreset_projectId_isPublished_idx" ON "Project3DScenePreset"("projectId", "isPublished");

-- CreateIndex
CREATE INDEX "Project3DCameraPreset_projectId_idx" ON "Project3DCameraPreset"("projectId");

-- CreateIndex
CREATE INDEX "Project3DCameraPreset_projectId_isDefault_idx" ON "Project3DCameraPreset"("projectId", "isDefault");

-- CreateIndex
CREATE INDEX "Project3DCameraPreset_scenePresetId_idx" ON "Project3DCameraPreset"("scenePresetId");

-- CreateIndex
CREATE INDEX "ImportJob_type_status_idx" ON "ImportJob"("type", "status");

-- CreateIndex
CREATE INDEX "ImportJob_projectId_idx" ON "ImportJob"("projectId");

-- CreateIndex
CREATE INDEX "ImportJob_project3DAssetId_idx" ON "ImportJob"("project3DAssetId");

-- CreateIndex
CREATE INDEX "Project3DBinding_projectId_idx" ON "Project3DBinding"("projectId");

-- CreateIndex
CREATE INDEX "Project3DBinding_projectId_targetType_idx" ON "Project3DBinding"("projectId", "targetType");

-- CreateIndex
CREATE INDEX "Project3DBinding_unitId_idx" ON "Project3DBinding"("unitId");

-- CreateIndex
CREATE INDEX "Project3DBinding_buildingId_idx" ON "Project3DBinding"("buildingId");

-- CreateIndex
CREATE INDEX "Project3DBinding_sectionId_idx" ON "Project3DBinding"("sectionId");

-- CreateIndex
CREATE INDEX "Project3DBinding_floorId_idx" ON "Project3DBinding"("floorId");

-- CreateIndex
CREATE INDEX "Project3DBinding_nodeKey_idx" ON "Project3DBinding"("nodeKey");

-- CreateIndex
CREATE INDEX "Deal_unitId_idx" ON "Deal"("unitId");

-- CreateIndex
CREATE INDEX "Deal_clientId_idx" ON "Deal"("clientId");

-- CreateIndex
CREATE INDEX "Deal_managerId_idx" ON "Deal"("managerId");

-- CreateIndex
CREATE INDEX "Deal_layoutVariantId_idx" ON "Deal"("layoutVariantId");

-- CreateIndex
CREATE INDEX "DemoDisplay_currentProjectId_idx" ON "DemoDisplay"("currentProjectId");

-- CreateIndex
CREATE INDEX "DemoDisplay_currentUnitId_idx" ON "DemoDisplay"("currentUnitId");

-- CreateIndex
CREATE INDEX "DemoDisplay_autoplayProjectId_idx" ON "DemoDisplay"("autoplayProjectId");

-- CreateIndex
CREATE INDEX "Document_dealId_idx" ON "Document"("dealId");

-- CreateIndex
CREATE INDEX "Document_templateId_idx" ON "Document"("templateId");

-- CreateIndex
CREATE INDEX "Document_signedByUserId_idx" ON "Document"("signedByUserId");

-- CreateIndex
CREATE INDEX "Payment_dealId_idx" ON "Payment"("dealId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");

-- CreateIndex
CREATE INDEX "Project_published3DAssetId_idx" ON "Project"("published3DAssetId");

-- CreateIndex
CREATE INDEX "Project_publishedScenePresetId_idx" ON "Project"("publishedScenePresetId");

-- CreateIndex
CREATE INDEX "Project_publishedCameraPresetId_idx" ON "Project"("publishedCameraPresetId");

-- CreateIndex
CREATE INDEX "Unit_projectId_idx" ON "Unit"("projectId");

-- CreateIndex
CREATE INDEX "Unit_buildingId_idx" ON "Unit"("buildingId");

-- CreateIndex
CREATE INDEX "Unit_sectionId_idx" ON "Unit"("sectionId");

-- CreateIndex
CREATE INDEX "Unit_floorId_idx" ON "Unit"("floorId");

-- CreateIndex
CREATE INDEX "Unit_modelElementKey_idx" ON "Unit"("modelElementKey");

-- CreateIndex
CREATE INDEX "UnitPlanVariant_unitId_isDefault_idx" ON "UnitPlanVariant"("unitId", "isDefault");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_published3DAssetId_fkey" FOREIGN KEY ("published3DAssetId") REFERENCES "Project3DAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_publishedScenePresetId_fkey" FOREIGN KEY ("publishedScenePresetId") REFERENCES "Project3DScenePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_publishedCameraPresetId_fkey" FOREIGN KEY ("publishedCameraPresetId") REFERENCES "Project3DCameraPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DAsset" ADD CONSTRAINT "Project3DAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DAsset" ADD CONSTRAINT "Project3DAsset_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "AssetFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DAsset" ADD CONSTRAINT "Project3DAsset_outputFileId_fkey" FOREIGN KEY ("outputFileId") REFERENCES "AssetFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DAsset" ADD CONSTRAINT "Project3DAsset_previewFileId_fkey" FOREIGN KEY ("previewFileId") REFERENCES "AssetFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DScenePreset" ADD CONSTRAINT "Project3DScenePreset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DCameraPreset" ADD CONSTRAINT "Project3DCameraPreset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DCameraPreset" ADD CONSTRAINT "Project3DCameraPreset_scenePresetId_fkey" FOREIGN KEY ("scenePresetId") REFERENCES "Project3DScenePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_project3DAssetId_fkey" FOREIGN KEY ("project3DAssetId") REFERENCES "Project3DAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DBinding" ADD CONSTRAINT "Project3DBinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DBinding" ADD CONSTRAINT "Project3DBinding_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DBinding" ADD CONSTRAINT "Project3DBinding_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DBinding" ADD CONSTRAINT "Project3DBinding_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project3DBinding" ADD CONSTRAINT "Project3DBinding_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
