import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return [
      { id: 'unit-1', name: 'Unit One' },
      { id: 'unit-2', name: 'Unit Two' },
    ];
  }
}
