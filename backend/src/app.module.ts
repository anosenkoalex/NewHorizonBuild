import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { UnitsModule } from './units/units.module';
import { DealsModule } from './deals/deals.module';
import { DocumentsModule } from './documents/documents.module';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    ProjectsModule,
    UnitsModule,
    DealsModule,
    DocumentsModule,
    ClientsModule,
  ],
})
export class AppModule {}
