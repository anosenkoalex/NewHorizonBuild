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
}
