import { Controller, Get, Query } from '@nestjs/common';
import { UnitStatus, UnitType } from '@prisma/client';
import { UnitsService } from './units.service';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('type') type?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minArea') minArea?: string,
    @Query('maxArea') maxArea?: string,
  ) {
    const parsedStatus =
      status && Object.values(UnitStatus).includes(status as UnitStatus)
        ? (status as UnitStatus)
        : undefined;
    const parsedType =
      type && Object.values(UnitType).includes(type as UnitType)
        ? (type as UnitType)
        : undefined;

    const parsedMinPrice = minPrice !== undefined ? Number(minPrice) : undefined;
    const parsedMaxPrice = maxPrice !== undefined ? Number(maxPrice) : undefined;
    const parsedMinArea = minArea !== undefined ? Number(minArea) : undefined;
    const parsedMaxArea = maxArea !== undefined ? Number(maxArea) : undefined;

    return this.unitsService.findAll({
      status: parsedStatus,
      projectId,
      buildingId,
      type: parsedType,
      minPrice: Number.isNaN(parsedMinPrice) ? undefined : parsedMinPrice,
      maxPrice: Number.isNaN(parsedMaxPrice) ? undefined : parsedMaxPrice,
      minArea: Number.isNaN(parsedMinArea) ? undefined : parsedMinArea,
      maxArea: Number.isNaN(parsedMaxArea) ? undefined : parsedMaxArea,
    });
  }
}
