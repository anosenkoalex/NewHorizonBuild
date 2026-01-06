// backend/src/units/units.controller.ts
import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { UnitStatus, UnitType, UserRole } from '@prisma/client';
import { UnitsService } from './units.service';
import { Roles } from '../auth/roles.decorator';

class UpdateModelElementKeyDto {
  modelElementKey: string | null;
}

class UpdatePlanImageUrlDto {
  planImageUrl: string | null;
}

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
      status &&
      Object.values(UnitStatus).includes(status as UnitStatus)
        ? (status as UnitStatus)
        : undefined;

    const parsedType =
      type && Object.values(UnitType).includes(type as UnitType)
        ? (type as UnitType)
        : undefined;

    const parsedMinPrice =
      minPrice !== undefined ? Number(minPrice) : undefined;
    const parsedMaxPrice =
      maxPrice !== undefined ? Number(maxPrice) : undefined;
    const parsedMinArea =
      minArea !== undefined ? Number(minArea) : undefined;
    const parsedMaxArea =
      maxArea !== undefined ? Number(maxArea) : undefined;

    return this.unitsService.findAll({
      status: parsedStatus,
      projectId,
      buildingId,
      type: parsedType,
      minPrice: Number.isNaN(parsedMinPrice)
        ? undefined
        : parsedMinPrice,
      maxPrice: Number.isNaN(parsedMaxPrice)
        ? undefined
        : parsedMaxPrice,
      minArea: Number.isNaN(parsedMinArea)
        ? undefined
        : parsedMinArea,
      maxArea: Number.isNaN(parsedMaxArea)
        ? undefined
        : parsedMaxArea,
    });
  }

  /**
   * Обновление modelElementKey у юнита.
   * Доступ, например, только для ADMIN / MANAGER / SALES_HEAD.
   */
  @Patch(':id/model-element-key')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_HEAD)
  updateModelElementKey(
    @Param('id') id: string,
    @Body() body: UpdateModelElementKeyDto,
  ) {
    const key =
      body.modelElementKey === '' || body.modelElementKey == null
        ? null
        : body.modelElementKey;

    return this.unitsService.updateModelElementKey(id, key);
  }

  /**
   * Обновление ссылки на 2D-планировку юнита.
   * planImageUrl может быть null, чтобы удалить план.
   */
  @Patch(':id/plan-image-url')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_HEAD)
  updatePlanImageUrl(
    @Param('id') id: string,
    @Body() body: UpdatePlanImageUrlDto,
  ) {
    const planImageUrl =
      body.planImageUrl === '' || body.planImageUrl == null
        ? null
        : body.planImageUrl;

    return this.unitsService.updatePlanImageUrl(id, planImageUrl);
  }
}
