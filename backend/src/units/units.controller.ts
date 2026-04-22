import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UnitStatus, UnitType, UserRole } from '@prisma/client';
import { UnitsService } from './units.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ThreeDWorkspaceGuard } from '../auth/three-d-workspace.guard';
import { RequireThreeDWorkspaceAccess } from '../auth/three-d-workspace.decorator';

class UpdateModelElementKeyDto {
  modelElementKey!: string | null;
}

class UpdatePlanImageUrlDto {
  planImageUrl!: string | null;
}

class UpdateUnit3DDto {
  modelElementKey?: string | null;
  planImageUrl?: string | null;
}

/**
 * Создание варианта планировки юнита.
 * Минимально — только name, остальное опционально.
 */
class CreateUnitPlanVariantDto {
  name!: string;
  code?: string | null;
  description?: string | null;
  area?: number | null;
  rooms?: number | null;
  isDefault?: boolean;
  planImageUrl?: string | null;
}

/**
 * Обновление варианта планировки юнита.
 * Всё опционально — можно менять частично.
 */
class UpdateUnitPlanVariantDto {
  name?: string;
  code?: string | null;
  description?: string | null;
  area?: number | null;
  rooms?: number | null;
  isDefault?: boolean;
  planImageUrl?: string | null;
}

type PublicUnitShape = {
  id: string;
  projectId?: string | null;
  buildingId?: string | null;
  sectionId?: string | null;
  floorId?: string | null;
  number?: string | null;
  type?: string | null;
  status?: string | null;
  area?: number | null;
  rooms?: number | null;
  price?: unknown;
  modelElementKey?: string | null;
  planImageUrl?: string | null;
};

const ALLOWED_PLAN_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
]);

function normalizeNullableText(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function parseOptionalNumber(value?: string): number | undefined {
  if (value === undefined) return undefined;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function getFileExtension(filename: unknown): string | null {
  const name = String(filename ?? '').trim();
  if (!name || !name.includes('.')) return null;

  const ext = name.split('.').pop()?.toLowerCase().trim() ?? '';
  return ext || null;
}

function normalizePublicPrice(value: unknown): number | string | null {
  if (value === null || typeof value === 'undefined') return null;

  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof (value as { toNumber: () => number }).toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toString' in value &&
    typeof (value as { toString: () => string }).toString === 'function'
  ) {
    return (value as { toString: () => string }).toString();
  }

  return null;
}

function toPublicUnit(u: PublicUnitShape) {
  return {
    id: u.id,
    projectId: u.projectId ?? null,
    buildingId: u.buildingId ?? null,
    sectionId: u.sectionId ?? null,
    floorId: u.floorId ?? null,

    number: u.number ?? null,
    type: u.type ?? null,
    status: u.status ?? null,

    area: u.area ?? null,
    rooms: u.rooms ?? null,
    price: normalizePublicPrice(u.price),

    modelElementKey: u.modelElementKey ?? null,
    planImageUrl: u.planImageUrl ?? null,
  };
}

function parseUnitFilters(params: {
  status?: string;
  projectId?: string;
  buildingId?: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  minArea?: string;
  maxArea?: string;
}) {
  const parsedStatus =
    params.status && Object.values(UnitStatus).includes(params.status as UnitStatus)
      ? (params.status as UnitStatus)
      : undefined;

  const parsedType =
    params.type && Object.values(UnitType).includes(params.type as UnitType)
      ? (params.type as UnitType)
      : undefined;

  return {
    status: parsedStatus,
    projectId: normalizeNullableText(params.projectId) ?? undefined,
    buildingId: normalizeNullableText(params.buildingId) ?? undefined,
    type: parsedType,
    minPrice: parseOptionalNumber(params.minPrice),
    maxPrice: parseOptionalNumber(params.maxPrice),
    minArea: parseOptionalNumber(params.minArea),
    maxArea: parseOptionalNumber(params.maxArea),
  };
}

/**
 * ПУБЛИЧНЫЕ юниты (для телевизора /demo/:code)
 * Без авторизации.
 */
@Controller('public/units')
export class PublicUnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  async findAllPublic(
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('type') type?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minArea') minArea?: string,
    @Query('maxArea') maxArea?: string,
  ) {
    const list = await this.unitsService.findAll(
      parseUnitFilters({
        status,
        projectId,
        buildingId,
        type,
        minPrice,
        maxPrice,
        minArea,
        maxArea,
      }),
    );

    return list.map((unit) => toPublicUnit(unit));
  }

  @Get(':id')
  async findOnePublic(@Param('id') id: string) {
    const unit = await this.unitsService.findOne(id);

    if (!unit) {
      throw new NotFoundException('Юнит не найден');
    }

    return toPublicUnit(unit);
  }
}

@Controller('units')
@UseGuards(JwtAuthGuard)
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
    return this.unitsService.findAll(
      parseUnitFilters({
        status,
        projectId,
        buildingId,
        type,
        minPrice,
        maxPrice,
        minArea,
        maxArea,
      }),
    );
  }

  /**
   * Общий PATCH /units/:id
   * Поддерживает обновление modelElementKey и planImageUrl одним запросом.
   *
   * Так как тут могут меняться и binding, и scene/plan data,
   * требуем доступ к hidden 3D workspace.
   */
  @Patch(':id')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('accessWorkspace')
  async updateUnit3D(
    @Param('id') id: string,
    @Body() body: UpdateUnit3DDto,
  ) {
    let result: any = null;

    if (typeof body.modelElementKey !== 'undefined') {
      result = await this.unitsService.updateModelElementKey(
        id,
        normalizeNullableText(body.modelElementKey),
      );
    }

    if (typeof body.planImageUrl !== 'undefined') {
      result = await this.unitsService.updatePlanImageUrl(
        id,
        normalizeNullableText(body.planImageUrl),
      );
    }

    return result ?? { success: true };
  }

  /**
   * Обновление modelElementKey у юнита.
   * Это 3D binding → manageBindings
   */
  @Patch(':id/model-element-key')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageBindings')
  updateModelElementKey(
    @Param('id') id: string,
    @Body() body: UpdateModelElementKeyDto,
  ) {
    return this.unitsService.updateModelElementKey(
      id,
      normalizeNullableText(body.modelElementKey),
    );
  }

  /**
   * Обновление ссылки на 2D-планировку юнита.
   * Это часть scene/plan data → manageScenes
   */
  @Patch(':id/plan-image-url')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  updatePlanImageUrl(
    @Param('id') id: string,
    @Body() body: UpdatePlanImageUrlDto,
  ) {
    return this.unitsService.updatePlanImageUrl(
      id,
      normalizeNullableText(body.planImageUrl),
    );
  }

  /**
   * Загрузка файла базовой планировки юнита.
   * Это часть scene/plan data → manageScenes
   */
  @Post(':id/plan/upload')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: 'uploads/unit-plans',
    }),
  )
  async uploadUnitPlanFile(
    @Param('id') unitId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не получен');
    }

    const ext = getFileExtension(file.originalname);
    if (!ext || !ALLOWED_PLAN_IMAGE_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Поддерживаются только изображения: ${Array.from(
          ALLOWED_PLAN_IMAGE_EXTENSIONS,
        ).join(', ')}`,
      );
    }

    const filename = String(file.filename ?? '').trim();
    if (!filename) {
      throw new BadRequestException('Не удалось сохранить файл планировки');
    }

    const url = `/uploads/unit-plans/${filename}`;

    return this.unitsService.updatePlanImageUrl(unitId, url);
  }

  // ==========================
  //   ВАРИАНТЫ ПЛАНИРОВОК
  // ==========================

  /**
   * Список вариантов планировок для конкретного юнита.
   * Просмотр оставляем доступным рабочим ролям CRM.
   */
  @Get(':id/plan-variants')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SALES_HEAD,
    UserRole.LEGAL,
    UserRole.VIEWER,
  )
  getUnitPlanVariants(@Param('id') unitId: string) {
    return this.unitsService.getUnitPlanVariants(unitId);
  }

  /**
   * Создать вариант планировки для юнита.
   * Это часть scene/plan data → manageScenes
   */
  @Post(':id/plan-variants')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  createUnitPlanVariant(
    @Param('id') unitId: string,
    @Body() body: CreateUnitPlanVariantDto,
  ) {
    const name = String(body?.name ?? '').trim();

    if (!name) {
      throw new BadRequestException('Поле name обязательно');
    }

    const payload: CreateUnitPlanVariantDto = {
      name,
      code: normalizeNullableText(body.code),
      description: normalizeNullableText(body.description),
      area:
        typeof body.area === 'number' && !Number.isNaN(body.area)
          ? body.area
          : null,
      rooms:
        typeof body.rooms === 'number' && !Number.isNaN(body.rooms)
          ? body.rooms
          : null,
      isDefault: body.isDefault,
      planImageUrl: normalizeNullableText(body.planImageUrl),
    };

    return this.unitsService.createUnitPlanVariant(unitId, payload);
  }

  /**
   * Обновить вариант планировки.
   * Это часть scene/plan data → manageScenes
   */
  @Patch(':id/plan-variants/:variantId')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  updateUnitPlanVariant(
    @Param('id') unitId: string,
    @Param('variantId') variantId: string,
    @Body() body: UpdateUnitPlanVariantDto,
  ) {
    const payload: UpdateUnitPlanVariantDto = {
      ...(body.name !== undefined && { name: String(body.name ?? '').trim() }),
      ...(body.code !== undefined && {
        code: normalizeNullableText(body.code),
      }),
      ...(body.description !== undefined && {
        description: normalizeNullableText(body.description),
      }),
      ...(body.area !== undefined && {
        area:
          typeof body.area === 'number' && !Number.isNaN(body.area)
            ? body.area
            : null,
      }),
      ...(body.rooms !== undefined && {
        rooms:
          typeof body.rooms === 'number' && !Number.isNaN(body.rooms)
            ? body.rooms
            : null,
      }),
      ...(body.isDefault !== undefined && {
        isDefault: body.isDefault,
      }),
      ...(body.planImageUrl !== undefined && {
        planImageUrl: normalizeNullableText(body.planImageUrl),
      }),
    };

    if (payload.name !== undefined && !payload.name) {
      throw new BadRequestException('Поле name не может быть пустым');
    }

    return this.unitsService.updateUnitPlanVariant(unitId, variantId, payload);
  }

  /**
   * Удалить вариант планировки.
   * Это часть scene/plan data → manageScenes
   */
  @Delete(':id/plan-variants/:variantId')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  deleteUnitPlanVariant(
    @Param('id') unitId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.unitsService.deleteUnitPlanVariant(unitId, variantId);
  }
}