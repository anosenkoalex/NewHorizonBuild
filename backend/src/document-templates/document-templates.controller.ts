// backend/src/document-templates/document-templates.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DocumentTemplatesService } from './document-templates.service.js';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto.js';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('document-templates')
@UseGuards(JwtAuthGuard)
export class DocumentTemplatesController {
  constructor(
    private readonly documentTemplatesService: DocumentTemplatesService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.LEGAL)
  async findAll() {
    return this.documentTemplatesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.LEGAL)
  async findOne(@Param('id') id: string) {
    return this.documentTemplatesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  async create(@Body() dto: CreateDocumentTemplateDto) {
    return this.documentTemplatesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentTemplateDto,
  ) {
    return this.documentTemplatesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  async remove(@Param('id') id: string) {
    return this.documentTemplatesService.remove(id);
  }
}