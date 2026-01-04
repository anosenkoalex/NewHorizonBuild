import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return [
      { id: 'deal-1', title: 'Demo Deal One' },
      { id: 'deal-2', title: 'Demo Deal Two' },
    ];
  }
}
