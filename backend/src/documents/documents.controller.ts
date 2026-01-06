import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Patch,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  DocumentsService,
  FindDocumentsFilters,
} from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { GenerateFromTemplateDto } from './dto/generate-from-template.dto.js';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('documents')
@UseGuards(JwtAuthGuard) // все ручки только с валидным JWT
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.LEGAL)
  async findAll(
    @Query('dealId') dealId?: string,
    @Query('type') type?: string,
    @Query('clientId') clientId?: string,
    @Query('unitId') unitId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const filters: FindDocumentsFilters = {};

    if (dealId) {
      filters.dealId = dealId;
    }

    if (type) {
      filters.type = type;
    }

    if (clientId) {
      filters.clientId = clientId;
    }

    if (unitId) {
      filters.unitId = unitId;
    }

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        filters.from = fromDate;
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        filters.to = toDate;
      }
    }

    return this.documentsService.findAll(
      Object.keys(filters).length ? filters : undefined,
    );
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  async create(@Body() dto: CreateDocumentDto) {
    return this.documentsService.create(dto);
  }

  @Post('generate-from-template')
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  async generateFromTemplate(@Body() dto: GenerateFromTemplateDto) {
    return this.documentsService.generateFromTemplate(dto);
  }

  /**
   * Подписать документ (электронная подпись упрощённого вида):
   * проставляем signedAt и signedByUserId = текущий пользователь.
   */
  @Patch(':id/sign')
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.LEGAL)
  async signDocument(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      throw new UnauthorizedException('Не удалось определить пользователя');
    }
    return this.documentsService.signDocument(id, userId);
  }
}
