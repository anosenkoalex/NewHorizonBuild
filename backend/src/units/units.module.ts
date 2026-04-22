import { Module } from '@nestjs/common';
import { UnitsController, PublicUnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ThreeDWorkspaceAccessModule } from '../three-d-workspace-access/three-d-workspace-access.module';

@Module({
  imports: [PrismaModule, ThreeDWorkspaceAccessModule],
  controllers: [UnitsController, PublicUnitsController],
  providers: [UnitsService],
})
export class UnitsModule {}