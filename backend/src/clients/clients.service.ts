import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // Список всех клиентов (для CRM этого более чем достаточно)
  findAll() {
    return this.prisma.client.findMany({
      include: {
        deals: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Один клиент по id (про запас, вдруг пригодится)
  findOne(id: string) {
    return this.prisma.client.findUnique({
      where: { id },
      include: {
        deals: true,
      },
    });
  }

  // Базовое создание клиента (сейчас не используется напрямую, но пусть будет)
  create(data: { fullName: string; phone: string; email?: string | null }) {
    return this.prisma.client.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email ?? null,
      },
    });
  }
}
