import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return [
      { id: 'document-1', title: 'Demo Document One' },
      { id: 'document-2', title: 'Demo Document Two' },
    ];
  }
}
