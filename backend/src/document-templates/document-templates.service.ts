// backend/src/document-templates/document-templates.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto.js';

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // cast к any, чтобы не ругался на documentTemplate
    return (this.prisma as any).documentTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateDocumentTemplateDto) {
    return (this.prisma as any).documentTemplate.create({
      data: {
        name: dto.name,
        type: dto.type,
        content: dto.content,
      },
    });
  }
}
