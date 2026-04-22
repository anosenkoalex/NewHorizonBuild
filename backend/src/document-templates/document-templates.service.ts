// backend/src/document-templates/document-templates.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto.js';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto.js';

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.documentTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Document template not found');
    }

    return template;
  }

  async create(dto: CreateDocumentTemplateDto) {
    return this.prisma.documentTemplate.create({
      data: {
        name: dto.name,
        type: dto.type,
        content: dto.content,
      },
    });
  }

  async update(id: string, dto: UpdateDocumentTemplateDto) {
    await this.findOne(id);

    return this.prisma.documentTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const linkedDocumentsCount = await this.prisma.document.count({
      where: { templateId: id },
    });

    if (linkedDocumentsCount > 0) {
      throw new BadRequestException(
        'Cannot delete template because it is already used in documents',
      );
    }

    return this.prisma.documentTemplate.delete({
      where: { id },
    });
  }
}