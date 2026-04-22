import { Module } from '@nestjs/common';
import { DemoDisplaysService } from './demo-displays.service';
import { DemoDisplaysController } from './demo-displays.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ThreeDWorkspaceAccessModule } from '../three-d-workspace-access/three-d-workspace-access.module';

@Module({
  imports: [PrismaModule, ThreeDWorkspaceAccessModule],
  controllers: [DemoDisplaysController],
  providers: [DemoDisplaysService],
  exports: [DemoDisplaysService],
})
export class DemoDisplaysModule {}