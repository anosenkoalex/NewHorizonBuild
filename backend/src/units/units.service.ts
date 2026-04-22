import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UnitStatus, UnitType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function getUnitWithPlanVariantsInclude(): Prisma.UnitInclude {
  return {
    planVariants: {
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    },
  };
}

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeId(value: string): string {
    return String(value ?? '').trim();
  }

  private normalizeNullableText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const normalized = String(value).trim();
    return normalized || null;
  }

  private async ensureUnitExists(unitId: string): Promise<void> {
    const normalizedUnitId = this.normalizeId(unitId);

    const unit = await this.prisma.unit.findUnique({
      where: { id: normalizedUnitId },
      select: { id: true },
    });

    if (!unit) {
      throw new NotFoundException('Юнит не найден');
    }
  }

  private async ensureVariantBelongsToUnit(
    unitId: string,
    variantId: string,
  ): Promise<{
    id: string;
    isDefault: boolean;
  }> {
    const normalizedUnitId = this.normalizeId(unitId);
    const normalizedVariantId = this.normalizeId(variantId);

    const variant = await this.prisma.unitPlanVariant.findFirst({
      where: {
        id: normalizedVariantId,
        unitId: normalizedUnitId,
      },
      select: {
        id: true,
        isDefault: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Вариант планировки не найден');
    }

    return variant;
  }

  findAll(filters: {
    status?: UnitStatus;
    projectId?: string;
    buildingId?: string;
    type?: UnitType;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
  } = {}) {
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
        projectId: projectId ? this.normalizeId(projectId) : undefined,
        buildingId: buildingId ? this.normalizeId(buildingId) : undefined,
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
      include: getUnitWithPlanVariantsInclude(),
      orderBy: [
        { buildingId: 'asc' },
        { sectionId: 'asc' },
        { floorId: 'asc' },
        { number: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const normalizedId = this.normalizeId(id);

    return this.prisma.unit.findUnique({
      where: { id: normalizedId },
      include: getUnitWithPlanVariantsInclude(),
    });
  }

  async updateModelElementKey(id: string, modelElementKey: string | null) {
    const normalizedId = this.normalizeId(id);
    await this.ensureUnitExists(normalizedId);

    return this.prisma.unit.update({
      where: { id: normalizedId },
      data: {
        modelElementKey: this.normalizeNullableText(modelElementKey) ?? null,
      },
      include: getUnitWithPlanVariantsInclude(),
    });
  }

  async updatePlanImageUrl(id: string, planImageUrl: string | null) {
    const normalizedId = this.normalizeId(id);
    await this.ensureUnitExists(normalizedId);

    return this.prisma.unit.update({
      where: { id: normalizedId },
      data: {
        planImageUrl: this.normalizeNullableText(planImageUrl) ?? null,
      },
      include: getUnitWithPlanVariantsInclude(),
    });
  }

  // ==============================
  //     ВАРИАНТЫ ПЛАНИРОВОК
  // ==============================

  async getUnitPlanVariants(unitId: string) {
    const normalizedUnitId = this.normalizeId(unitId);
    await this.ensureUnitExists(normalizedUnitId);

    return this.prisma.unitPlanVariant.findMany({
      where: { unitId: normalizedUnitId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createUnitPlanVariant(
    unitId: string,
    data: {
      name: string;
      code?: string | null;
      description?: string | null;
      area?: number | null;
      rooms?: number | null;
      isDefault?: boolean;
      planImageUrl?: string | null;
    },
  ) {
    const normalizedUnitId = this.normalizeId(unitId);
    await this.ensureUnitExists(normalizedUnitId);

    return this.prisma.$transaction(async (tx) => {
      const existingVariantsCount = await tx.unitPlanVariant.count({
        where: { unitId: normalizedUnitId },
      });

      const shouldBeDefault =
        data.isDefault === true || existingVariantsCount === 0;

      if (shouldBeDefault) {
        await tx.unitPlanVariant.updateMany({
          where: { unitId: normalizedUnitId },
          data: { isDefault: false },
        });
      }

      return tx.unitPlanVariant.create({
        data: {
          unitId: normalizedUnitId,
          name: String(data.name ?? '').trim(),
          code: this.normalizeNullableText(data.code) ?? null,
          description: this.normalizeNullableText(data.description) ?? null,
          area: data.area ?? null,
          rooms: data.rooms ?? null,
          planImageUrl: this.normalizeNullableText(data.planImageUrl) ?? null,
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  async updateUnitPlanVariant(
    unitId: string,
    variantId: string,
    data: {
      name?: string;
      code?: string | null;
      description?: string | null;
      area?: number | null;
      rooms?: number | null;
      isDefault?: boolean;
      planImageUrl?: string | null;
    },
  ) {
    const normalizedUnitId = this.normalizeId(unitId);
    const normalizedVariantId = this.normalizeId(variantId);

    await this.ensureUnitExists(normalizedUnitId);
    const existingVariant = await this.ensureVariantBelongsToUnit(
      normalizedUnitId,
      normalizedVariantId,
    );

    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        await tx.unitPlanVariant.updateMany({
          where: {
            unitId: normalizedUnitId,
            id: { not: normalizedVariantId },
          },
          data: {
            isDefault: false,
          },
        });
      }

      const updated = await tx.unitPlanVariant.update({
        where: { id: normalizedVariantId },
        data: {
          ...(data.name !== undefined && {
            name: String(data.name ?? '').trim(),
          }),
          ...(data.code !== undefined && {
            code: this.normalizeNullableText(data.code) ?? null,
          }),
          ...(data.description !== undefined && {
            description: this.normalizeNullableText(data.description) ?? null,
          }),
          ...(data.area !== undefined && { area: data.area }),
          ...(data.rooms !== undefined && { rooms: data.rooms }),
          ...(data.planImageUrl !== undefined && {
            planImageUrl: this.normalizeNullableText(data.planImageUrl) ?? null,
          }),
          ...(data.isDefault !== undefined && {
            isDefault: data.isDefault,
          }),
        },
      });

      if (existingVariant.isDefault && data.isDefault === false) {
        const fallback = await tx.unitPlanVariant.findFirst({
          where: {
            unitId: normalizedUnitId,
            id: { not: normalizedVariantId },
          },
          orderBy: [{ createdAt: 'asc' }],
          select: { id: true },
        });

        if (fallback) {
          await tx.unitPlanVariant.update({
            where: { id: fallback.id },
            data: { isDefault: true },
          });
        }
      }

      return updated;
    });
  }

  async deleteUnitPlanVariant(unitId: string, variantId: string) {
    const normalizedUnitId = this.normalizeId(unitId);
    const normalizedVariantId = this.normalizeId(variantId);

    await this.ensureUnitExists(normalizedUnitId);
    const existingVariant = await this.ensureVariantBelongsToUnit(
      normalizedUnitId,
      normalizedVariantId,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.unitPlanVariant.delete({
        where: { id: normalizedVariantId },
      });

      if (existingVariant.isDefault) {
        const fallback = await tx.unitPlanVariant.findFirst({
          where: { unitId: normalizedUnitId },
          orderBy: [{ createdAt: 'asc' }],
          select: { id: true },
        });

        if (fallback) {
          await tx.unitPlanVariant.update({
            where: { id: fallback.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { success: true };
  }
}