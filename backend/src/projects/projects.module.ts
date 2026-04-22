import { Module } from '@nestjs/common';
import {
  ProjectsController,
  PublicProjectsController,
} from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ThreeDWorkspaceAccessModule } from '../three-d-workspace-access/three-d-workspace-access.module';

@Module({
  imports: [PrismaModule, ThreeDWorkspaceAccessModule],
  controllers: [ProjectsController, PublicProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}