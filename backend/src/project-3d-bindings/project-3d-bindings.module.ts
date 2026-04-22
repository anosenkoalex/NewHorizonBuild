import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ThreeDWorkspaceAccessModule } from '../three-d-workspace-access/three-d-workspace-access.module';
import { Project3DBindingsController } from './project-3d-bindings.controller';
import { Project3DBindingsService } from './project-3d-bindings.service';

@Module({
  imports: [PrismaModule, ThreeDWorkspaceAccessModule],
  controllers: [Project3DBindingsController],
  providers: [Project3DBindingsService],
  exports: [Project3DBindingsService],
})
export class Project3DBindingsModule {}