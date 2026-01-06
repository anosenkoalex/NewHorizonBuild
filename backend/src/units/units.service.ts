// backend/src/units/units.service.ts
import { Injectable } from '@nestjs/common';
import { UnitStatus, UnitType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: {
    status?: UnitStatus;
    projectId?: string;
    buildingId?: string;
    type?: UnitType;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
  }) {
    const {
      status,
      projectId,
      buildingId,
      type,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
    } = filters;

    return this.prisma.unit.findMany({
      where: {
        status,
        projectId,
        buildingId,
        type,
        price:
          minPrice !== undefined || maxPrice !== undefined
            ? {
                gte: minPrice,
                lte: maxPrice,
              }
            : undefined,
        area:
          minArea !== undefined || maxArea !== undefined
            ? {
                gte: minArea,
                lte: maxArea,
              }
            : undefined,
      },
    });
  }

  /**
   * Обновить связку юнита с элементом 3D-сцены.
   * modelElementKey может быть null, чтобы отвязать.
   */
  async updateModelElementKey(
    id: string,
    modelElementKey: string | null,
  ) {
    return this.prisma.unit.update({
      where: { id },
      data: {
        modelElementKey,
      },
    });
  }

  /**
   * Обновить ссылку на 2D-планировку.
   * Используем raw SQL, чтобы не упираться в старый prisma client.
   */
  async updatePlanImageUrl(id: string, planImageUrl: string | null) {
    await this.prisma.$executeRaw`
      UPDATE "Unit"
      SET "planImageUrl" = ${planImageUrl}
      WHERE "id" = ${id}
    `;

    // Возвращаем свежий юнит
    return this.prisma.unit.findUnique({
      where: { id },
    });
  }
}
