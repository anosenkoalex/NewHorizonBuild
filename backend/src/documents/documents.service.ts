import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { GenerateFromTemplateDto } from './dto/generate-from-template.dto.js';

export interface FindDocumentsFilters {
  dealId?: string;
  type?: string;
  clientId?: string;
  unitId?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly documentInclude = {
    deal: {
      include: {
        unit: true,
        client: true,
        manager: true,
      },
    },
    signedBy: {
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    },
    template: true,
  } as const;

  private async ensureDealExists(dealId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    return deal;
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private buildWhere(filters?: FindDocumentsFilters): Prisma.DocumentWhereInput {
    const where: Prisma.DocumentWhereInput = {};

    if (!filters) {
      return where;
    }

    const { dealId, type, clientId, unitId, from, to } = filters;

    if (dealId) {
      where.dealId = dealId;
    }

    if (type) {
      where.type = type;
    }

    if (from || to) {
      where.createdAt = {};

      if (from) {
        where.createdAt.gte = from;
      }

      if (to) {
        where.createdAt.lte = to;
      }
    }

    if (clientId || unitId) {
      where.deal = {};

      if (clientId) {
        where.deal.clientId = clientId;
      }

      if (unitId) {
        where.deal.unitId = unitId;
      }
    }

    return where;
  }

  async findAll(filters?: FindDocumentsFilters) {
    return this.prisma.document.findMany({
      where: this.buildWhere(filters),
      orderBy: { createdAt: 'desc' },
      include: this.documentInclude,
    });
  }

  async create(dto: CreateDocumentDto) {
    const dealId = String(dto.dealId ?? '').trim();
    const type = String(dto.type ?? '').trim();
    const fileUrl = dto.fileUrl ? String(dto.fileUrl).trim() : null;
    const content = dto.content ? String(dto.content) : null;

    if (!dealId) {
      throw new BadRequestException('dealId обязателен');
    }

    if (!type) {
      throw new BadRequestException('type обязателен');
    }

    if (!fileUrl && !content) {
      throw new BadRequestException(
        'Нужно указать либо ссылку на файл, либо текст документа',
      );
    }

    await this.ensureDealExists(dealId);

    return this.prisma.document.create({
      data: {
        dealId,
        type,
        fileUrl,
        content,
      },
      include: this.documentInclude,
    });
  }

  async generateFromTemplate(dto: GenerateFromTemplateDto) {
    const { templateId, dealId } = dto;

    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Document template not found');
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        unit: true,
        client: true,
        manager: true,
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    const context = {
      deal,
      unit: deal.unit,
      client: deal.client,
      manager: deal.manager,
    };

    const renderedContent = this.renderTemplate(template.content, context);

    return this.prisma.document.create({
      data: {
        dealId: deal.id,
        type: template.type,
        content: renderedContent,
        templateId: template.id,
      },
      include: this.documentInclude,
    });
  }

  async signDocument(id: string, userId: string) {
    await this.ensureUserExists(userId);

    const existing = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Document not found');
    }

    if (existing.signedAt) {
      return this.prisma.document.findUnique({
        where: { id },
        include: this.documentInclude,
      });
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        signedAt: new Date(),
        signedByUserId: userId,
      },
      include: this.documentInclude,
    });
  }

  private renderTemplate(content: string, context: Record<string, unknown>): string {
    if (!content) return '';

    return content.replace(/{{\s*([\w.]+)\s*}}/g, (_match, path: string) => {
      const parts = path.split('.');
      let value: unknown = context;

      for (const part of parts) {
        if (
          value &&
          typeof value === 'object' &&
          part in (value as Record<string, unknown>)
        ) {
          value = (value as Record<string, unknown>)[part];
        } else {
          return '';
        }
      }

      if (value === null || value === undefined) return '';

      if (value instanceof Date) {
        return value.toISOString();
      }

      if (typeof value === 'object') {
        return '';
      }

      return String(value);
    });
  }
}