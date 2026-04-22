import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.client.findMany({
      include: {
        deals: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        deals: {
          include: {
            unit: {
              select: {
                id: true,
                number: true,
                type: true,
                status: true,
                area: true,
                price: true,
                projectId: true,
              },
            },
            manager: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            comments: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 5,
              include: {
                author: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
            statusHistory: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 10,
              include: {
                changedBy: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    return client;
  }

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