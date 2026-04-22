-- CreateTable
CREATE TABLE "ThreeDWorkspaceAccess" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canAccessWorkspace" BOOLEAN NOT NULL DEFAULT true,
    "canUploadModels" BOOLEAN NOT NULL DEFAULT false,
    "canManageScenes" BOOLEAN NOT NULL DEFAULT false,
    "canConfigureWalkthroughs" BOOLEAN NOT NULL DEFAULT false,
    "canManageBindings" BOOLEAN NOT NULL DEFAULT false,
    "canPublish" BOOLEAN NOT NULL DEFAULT false,
    "canManageAccess" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreeDWorkspaceAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThreeDWorkspaceAccess_email_key" ON "ThreeDWorkspaceAccess"("email");

-- CreateIndex
CREATE INDEX "ThreeDWorkspaceAccess_isActive_idx" ON "ThreeDWorkspaceAccess"("isActive");
