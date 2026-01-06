// backend/src/document-templates/document-templates.module.ts
import { Module } from '@nestjs/common';
import { DocumentTemplatesController } from './document-templates.controller.js';
import { DocumentTemplatesService } from './document-templates.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentTemplatesController],
  providers: [DocumentTemplatesService],
})
export class DocumentTemplatesModule {}
