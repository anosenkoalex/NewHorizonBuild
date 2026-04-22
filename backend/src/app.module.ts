import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { UnitsModule } from './units/units.module';
import { DealsModule } from './deals/deals.module';
import { DocumentsModule } from './documents/documents.module';
import { ClientsModule } from './clients/clients.module';
import { ReportsModule } from './reports/reports.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DocumentTemplatesModule } from './document-templates/document-templates.module';
import { PaymentsModule } from './payments/payments.module';
import { DemoDisplaysModule } from './demo-displays/demo-displays.module';
import { Project3DAssetsModule } from './project-3d-assets/project-3d-assets.module';
import { Project3DBindingsModule } from './project-3d-bindings/project-3d-bindings.module';
import { ThreeDWorkspaceAccessModule } from './three-d-workspace-access/three-d-workspace-access.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ThreeDWorkspaceAccessModule,
    Project3DAssetsModule,
    Project3DBindingsModule,
    UnitsModule,
    DealsModule,
    DocumentsModule,
    ClientsModule,
    ReportsModule,
    DocumentTemplatesModule,
    PaymentsModule,
    DemoDisplaysModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}