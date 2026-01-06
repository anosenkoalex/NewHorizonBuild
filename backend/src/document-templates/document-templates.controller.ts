// backend/src/document-templates/document-templates.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DocumentTemplatesService } from './document-templates.service.js';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('document-templates')
@UseGuards(JwtAuthGuard) // все ручки только с валидным JWT
export class DocumentTemplatesController {
  constructor(private readonly service: DocumentTemplatesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.LEGAL)
  async findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  async create(@Body() dto: CreateDocumentTemplateDto) {
    return this.service.create(dto);
  }
}
