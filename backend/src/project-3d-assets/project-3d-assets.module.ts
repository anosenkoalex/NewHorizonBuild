import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ThreeDWorkspaceAccessModule } from '../three-d-workspace-access/three-d-workspace-access.module';
import { Project3DAssetsController } from './project-3d-assets.controller';
import { Project3DAssetsService } from './project-3d-assets.service';

@Module({
  imports: [PrismaModule, ThreeDWorkspaceAccessModule],
  controllers: [Project3DAssetsController],
  providers: [Project3DAssetsService],
  exports: [Project3DAssetsService],
})
export class Project3DAssetsModule {}