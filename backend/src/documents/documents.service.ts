import { Injectable, NotFoundException } from '@nestjs/common';
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

  /**
   * Список документов с краткой инфой по сделке
   * Фильтры опциональны — если не передать, вернёт всё как раньше.
   */
  async findAll(filters?: FindDocumentsFilters) {
    const where: any = {};

    if (filters) {
      const { dealId, type, clientId, unitId, from, to } = filters;

      if (dealId) {
        where.dealId = dealId;
      }

      if (type) {
        where.type = type;
      }

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = from;
        if (to) where.createdAt.lte = to;
      }

      // Фильтрация по клиенту / юниту через связанную сделку
      if (clientId || unitId) {
        where.deal = {};
        if (clientId) {
          where.deal.clientId = clientId;
        }
        if (unitId) {
          where.deal.unitId = unitId;
        }
      }
    }

    return (this.prisma as any).document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        deal: {
          include: {
            unit: true,
            client: true,
            manager: true,
          },
        },
        signedBy: true,
      },
    });
  }

  /**
   * Ручное создание документа (как было: просто ссылка на файл)
   */
  async create(dto: CreateDocumentDto) {
    const { dealId, type, fileUrl } = dto;

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    // Возвращаем сразу документ с привязками (как в findAll),
    // чтобы фронт мог тут же отрисовать строку без доп. запроса.
    return (this.prisma as any).document.create({
      data: {
        dealId,
        type,
        fileUrl,
      },
      include: {
        deal: {
          include: {
            unit: true,
            client: true,
            manager: true,
          },
        },
        signedBy: true,
      },
    });
  }

  /**
   * Генерация документа по шаблону и сделке
   */
  async generateFromTemplate(dto: GenerateFromTemplateDto) {
    const { templateId, dealId } = dto;

    // Через any, чтобы не бодаться с типами PrismaClient
    const template = await (this.prisma as any).documentTemplate.findUnique({
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

    const document = await (this.prisma as any).document.create({
      data: {
        dealId: deal.id,
        type: template.type,
        content: renderedContent,
      },
      include: {
        deal: {
          include: {
            unit: true,
            client: true,
            manager: true,
          },
        },
        signedBy: true,
      },
    });

    return document;
  }

  /**
   * Подписать документ: проставляем дату и пользователя.
   * Если уже подписан — возвращаем актуальное состояние.
   */
  async signDocument(id: string, userId: string) {
    const existing = await (this.prisma as any).document.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Document not found');
    }

    // Если уже подписан — просто отдать с include
    if (existing.signedAt) {
      return (this.prisma as any).document.findUnique({
        where: { id },
        include: {
          deal: {
            include: {
              unit: true,
              client: true,
              manager: true,
            },
          },
          signedBy: true,
        },
      });
    }

    return (this.prisma as any).document.update({
      where: { id },
      data: {
        signedAt: new Date(),
        signedByUserId: userId,
      },
      include: {
        deal: {
          include: {
            unit: true,
            client: true,
            manager: true,
          },
        },
        signedBy: true,
      },
    });
  }

  /**
   * Очень простой рендер {{path.to.field}} из контекста
   * Примеры:
   *  - {{client.fullName}}
   *  - {{unit.number}}
   *  - {{deal.type}}
   *  - {{manager.fullName}}
   */
  private renderTemplate(content: string, context: any): string {
    if (!content) return '';

    return content.replace(/{{\s*([\w.]+)\s*}}/g, (_match, path: string) => {
      const parts = path.split('.');
      let value: any = context;

      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return '';
        }
      }

      if (value === null || value === undefined) return '';
      return String(value);
    });
  }
}
