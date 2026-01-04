import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDocumentDto {
  dealId: string;
  type: string;
  fileUrl: string;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.document.findMany({ include: { deal: true } });
  }

  create(dto: CreateDocumentDto) {
    return this.prisma.document.create({ data: dto });
  }
}
