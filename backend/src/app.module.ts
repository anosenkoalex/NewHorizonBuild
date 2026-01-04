import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { UnitsModule } from './units/units.module';
import { DealsModule } from './deals/deals.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    ProjectsModule,
    UnitsModule,
    DealsModule,
    DocumentsModule,
  ],
})
export class AppModule {}
