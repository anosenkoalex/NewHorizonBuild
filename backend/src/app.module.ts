// backend/src/app.module.ts
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

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    UnitsModule,
    DealsModule,
    DocumentsModule,
    ClientsModule,
    ReportsModule,
    DocumentTemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
