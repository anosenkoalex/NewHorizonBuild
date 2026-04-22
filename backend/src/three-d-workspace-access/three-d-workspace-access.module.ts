import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ThreeDWorkspaceAccessController } from './three-d-workspace-access.controller';
import { ThreeDWorkspaceAccessService } from './three-d-workspace-access.service';

@Module({
  imports: [PrismaModule],
  controllers: [ThreeDWorkspaceAccessController],
  providers: [ThreeDWorkspaceAccessService],
  exports: [ThreeDWorkspaceAccessService],
})
export class ThreeDWorkspaceAccessModule {}