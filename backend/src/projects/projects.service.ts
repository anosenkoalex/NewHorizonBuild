import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpdateProject3DInput {
  threeDModelUrl?: string | null;
  threeDModelFormat?: string | null;
  threeDPreviewImage?: string | null;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // Список проектов для CRM и 3D Viewer
  findAll() {
    return this.prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        threeDModelUrl: true,
        threeDModelFormat: true,
        threeDPreviewImage: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Детальная инфа по одному проекту (про запас)
  findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        threeDModelUrl: true,
        threeDModelFormat: true,
        threeDPreviewImage: true,
      },
    });
  }

  // Обновление 3D-полей проекта
  async update3D(id: string, data: UpdateProject3DInput) {
    return this.prisma.project.update({
      where: { id },
      data: {
        threeDModelUrl: data.threeDModelUrl ?? null,
        threeDModelFormat: data.threeDModelFormat ?? null,
        threeDPreviewImage: data.threeDPreviewImage ?? null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        threeDModelUrl: true,
        threeDModelFormat: true,
        threeDPreviewImage: true,
      },
    });
  }
}
