import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateClientDto {
  fullName: string;
  phone: string;
  email?: string;
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.client.findMany();
  }

  create(dto: CreateClientDto) {
    return this.prisma.client.create({ data: dto });
  }
}
