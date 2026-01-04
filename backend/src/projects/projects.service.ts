import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return [
      { id: 'project-1', name: 'Demo Project One' },
      { id: 'project-2', name: 'Demo Project Two' },
    ];
  }
}
