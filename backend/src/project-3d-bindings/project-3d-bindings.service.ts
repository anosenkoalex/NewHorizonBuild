import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Project3DBindingTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateProject3DBindingInput {
  projectId: string;
  targetType: Project3DBindingTargetType;

  buildingId?: string | null;
  sectionId?: string | null;
  floorId?: string | null;
  unitId?: string | null;

  nodeKey: string;
  nodeName?: string | null;
  nodePath?: string | null;
  groupName?: string | null;
  materialName?: string | null;

  isPrimary?: boolean;
  metaJson?: unknown;
}

export interface UpdateProject3DBindingInput {
  targetType?: Project3DBindingTargetType;

  buildingId?: string | null;
  sectionId?: string | null;
  floorId?: string | null;
  unitId?: string | null;

  nodeKey?: string;
  nodeName?: string | null;
  nodePath?: string | null;
  groupName?: string | null;
  materialName?: string | null;

  isPrimary?: boolean;
  metaJson?: unknown;
}

export interface UpsertUnitPrimaryBindingInput {
  projectId: string;
  unitId: string;
  nodeKey: string;
  nodeName?: string | null;
  nodePath?: string | null;
  groupName?: string | null;
  materialName?: string | null;
  metaJson?: unknown;
}

type CanonicalTargetRefs = {
  buildingId: string | null;
  sectionId: string | null;
  floorId: string | null;
  unitId: string | null;
};

type DbClient = PrismaService | Prisma.TransactionClient;

const bindingSelect = {
  id: true,
  projectId: true,
  targetType: true,
  buildingId: true,
  sectionId: true,
  floorId: true,
  unitId: true,
  nodeKey: true,
  nodeName: true,
  nodePath: true,
  groupName: true,
  materialName: true,
  isPrimary: true,
  metaJson: true,
  createdAt: true,
  updatedAt: true,

  building: {
    select: {
      id: true,
      label: true,
      projectId: true,
    },
  },
  section: {
    select: {
      id: true,
      name: true,
      buildingId: true,
    },
  },
  floor: {
    select: {
      id: true,
      number: true,
      buildingId: true,
      sectionId: true,
    },
  },
  unit: {
    select: {
      id: true,
      number: true,
      projectId: true,
      buildingId: true,
      sectionId: true,
      floorId: true,
      modelElementKey: true,
    },
  },
} as const;

@Injectable()
export class Project3DBindingsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeNullableText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const normalized = String(value).trim();
    return normalized || null;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = String(value ?? '').trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} обязателен`);
    }

    return normalized;
  }

  private toJsonValue(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const normalizedProjectId = this.normalizeRequiredText(
      projectId,
      'projectId',
    );

    const project = await this.prisma.project.findUnique({
      where: { id: normalizedProjectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }
  }

  private async getBindingOrThrow(bindingId: string) {
    const normalizedBindingId = this.normalizeRequiredText(
      bindingId,
      'bindingId',
    );

    const binding = await this.prisma.project3DBinding.findUnique({
      where: { id: normalizedBindingId },
      select: {
        id: true,
        projectId: true,
        targetType: true,
        buildingId: true,
        sectionId: true,
        floorId: true,
        unitId: true,
        nodeKey: true,
        isPrimary: true,
      },
    });

    if (!binding) {
      throw new NotFoundException('3D-binding не найден');
    }

    return binding;
  }

  private async ensureBuildingInProject(
    projectId: string,
    buildingId: string,
  ): Promise<{ buildingId: string }> {
    const normalizedProjectId = this.normalizeRequiredText(
      projectId,
      'projectId',
    );
    const normalizedBuildingId = this.normalizeRequiredText(
      buildingId,
      'buildingId',
    );

    const building = await this.prisma.building.findUnique({
      where: { id: normalizedBuildingId },
      select: { id: true, projectId: true },
    });

    if (!building) {
      throw new NotFoundException('Building не найден');
    }

    if (building.projectId !== normalizedProjectId) {
      throw new BadRequestException('Building не принадлежит проекту');
    }

    return {
      buildingId: building.id,
    };
  }

  private async ensureSectionInProject(
    projectId: string,
    sectionId: string,
  ): Promise<{ buildingId: string; sectionId: string }> {
    const normalizedProjectId = this.normalizeRequiredText(
      projectId,
      'projectId',
    );
    const normalizedSectionId = this.normalizeRequiredText(
      sectionId,
      'sectionId',
    );

    const section = await this.prisma.section.findUnique({
      where: { id: normalizedSectionId },
      select: {
        id: true,
        buildingId: true,
        building: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section не найден');
    }

    if (section.building.projectId !== normalizedProjectId) {
      throw new BadRequestException('Section не принадлежит проекту');
    }

    return {
      buildingId: section.buildingId,
      sectionId: section.id,
    };
  }

  private async ensureFloorInProject(
    projectId: string,
    floorId: string,
  ): Promise<{ buildingId: string; sectionId: string | null; floorId: string }> {
    const normalizedProjectId = this.normalizeRequiredText(
      projectId,
      'projectId',
    );
    const normalizedFloorId = this.normalizeRequiredText(floorId, 'floorId');

    const floor = await this.prisma.floor.findUnique({
      where: { id: normalizedFloorId },
      select: {
        id: true,
        buildingId: true,
        sectionId: true,
        building: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!floor) {
      throw new NotFoundException('Floor не найден');
    }

    if (floor.building.projectId !== normalizedProjectId) {
      throw new BadRequestException('Floor не принадлежит проекту');
    }

    return {
      buildingId: floor.buildingId,
      sectionId: floor.sectionId ?? null,
      floorId: floor.id,
    };
  }

  private async ensureUnitInProject(
    projectId: string,
    unitId: string,
  ): Promise<{
    buildingId: string;
    sectionId: string | null;
    floorId: string | null;
    unitId: string;
  }> {
    const normalizedProjectId = this.normalizeRequiredText(
      projectId,
      'projectId',
    );
    const normalizedUnitId = this.normalizeRequiredText(unitId, 'unitId');

    const unit = await this.prisma.unit.findUnique({
      where: { id: normalizedUnitId },
      select: {
        id: true,
        projectId: true,
        buildingId: true,
        sectionId: true,
        floorId: true,
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit не найден');
    }

    if (unit.projectId !== normalizedProjectId) {
      throw new BadRequestException('Unit не принадлежит проекту');
    }

    return {
      buildingId: unit.buildingId,
      sectionId: unit.sectionId ?? null,
      floorId: unit.floorId ?? null,
      unitId: unit.id,
    };
  }

  private async resolveCanonicalTargetRefs(
    projectId: string,
    targetType: Project3DBindingTargetType,
    refs: {
      buildingId?: string | null;
      sectionId?: string | null;
      floorId?: string | null;
      unitId?: string | null;
    },
  ): Promise<CanonicalTargetRefs> {
    const normalizedProjectId = this.normalizeRequiredText(
      projectId,
      'projectId',
    );
    const buildingId = this.normalizeNullableText(refs.buildingId) ?? null;
    const sectionId = this.normalizeNullableText(refs.sectionId) ?? null;
    const floorId = this.normalizeNullableText(refs.floorId) ?? null;
    const unitId = this.normalizeNullableText(refs.unitId) ?? null;

    switch (targetType) {
      case Project3DBindingTargetType.PROJECT: {
        return {
          buildingId: null,
          sectionId: null,
          floorId: null,
          unitId: null,
        };
      }

      case Project3DBindingTargetType.BUILDING: {
        if (!buildingId) {
          throw new BadRequestException(
            'Для BUILDING binding обязателен buildingId',
          );
        }

        const building = await this.ensureBuildingInProject(
          normalizedProjectId,
          buildingId,
        );

        return {
          buildingId: building.buildingId,
          sectionId: null,
          floorId: null,
          unitId: null,
        };
      }

      case Project3DBindingTargetType.SECTION: {
        if (!sectionId) {
          throw new BadRequestException(
            'Для SECTION binding обязателен sectionId',
          );
        }

        const section = await this.ensureSectionInProject(
          normalizedProjectId,
          sectionId,
        );

        if (buildingId && buildingId !== section.buildingId) {
          throw new BadRequestException(
            'buildingId не совпадает с section.buildingId',
          );
        }

        return {
          buildingId: section.buildingId,
          sectionId: section.sectionId,
          floorId: null,
          unitId: null,
        };
      }

      case Project3DBindingTargetType.FLOOR: {
        if (!floorId) {
          throw new BadRequestException('Для FLOOR binding обязателен floorId');
        }

        const floor = await this.ensureFloorInProject(
          normalizedProjectId,
          floorId,
        );

        if (buildingId && buildingId !== floor.buildingId) {
          throw new BadRequestException(
            'buildingId не совпадает с floor.buildingId',
          );
        }

        if (sectionId && sectionId !== floor.sectionId) {
          throw new BadRequestException(
            'sectionId не совпадает с floor.sectionId',
          );
        }

        return {
          buildingId: floor.buildingId,
          sectionId: floor.sectionId,
          floorId: floor.floorId,
          unitId: null,
        };
      }

      case Project3DBindingTargetType.UNIT: {
        if (!unitId) {
          throw new BadRequestException('Для UNIT binding обязателен unitId');
        }

        const unit = await this.ensureUnitInProject(
          normalizedProjectId,
          unitId,
        );

        if (buildingId && buildingId !== unit.buildingId) {
          throw new BadRequestException(
            'buildingId не совпадает с unit.buildingId',
          );
        }

        if (sectionId && sectionId !== unit.sectionId) {
          throw new BadRequestException(
            'sectionId не совпадает с unit.sectionId',
          );
        }

        if (floorId && floorId !== unit.floorId) {
          throw new BadRequestException('floorId не совпадает с unit.floorId');
        }

        return {
          buildingId: unit.buildingId,
          sectionId: unit.sectionId,
          floorId: unit.floorId,
          unitId: unit.unitId,
        };
      }

      default:
        throw new BadRequestException('Некорректный targetType');
    }
  }

  private async syncUnitRuntimeModelElementKey(
    db: DbClient,
    unitId: string,
    nodeKey: string | null,
  ): Promise<void> {
    await db.unit.update({
      where: { id: unitId },
      data: {
        modelElementKey: nodeKey,
      },
    });
  }

  private async syncPrimaryUnitBindingToRuntime(
    db: DbClient,
    unitId: string,
  ): Promise<void> {
    const primaryBinding = await db.project3DBinding.findFirst({
      where: {
        unitId,
        targetType: Project3DBindingTargetType.UNIT,
        isPrimary: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        nodeKey: true,
      },
    });

    await this.syncUnitRuntimeModelElementKey(
      db,
      unitId,
      primaryBinding?.nodeKey ?? null,
    );
  }

  private async dropOtherPrimaryUnitBindings(
    db: DbClient,
    unitId: string,
    excludeBindingId?: string,
  ): Promise<void> {
    await db.project3DBinding.updateMany({
      where: {
        unitId,
        targetType: Project3DBindingTargetType.UNIT,
        isPrimary: true,
        ...(excludeBindingId
          ? {
              id: {
                not: excludeBindingId,
              },
            }
          : {}),
      },
      data: {
        isPrimary: false,
      },
    });
  }

  async listByProject(projectId: string) {
    const normalizedProjectId = this.normalizeRequiredText(
      projectId,
      'projectId',
    );

    await this.ensureProjectExists(normalizedProjectId);

    return this.prisma.project3DBinding.findMany({
      where: { projectId: normalizedProjectId },
      select: bindingSelect,
      orderBy: [
        { targetType: 'asc' },
        { isPrimary: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(bindingId: string) {
    const normalizedBindingId = this.normalizeRequiredText(
      bindingId,
      'bindingId',
    );

    const binding = await this.prisma.project3DBinding.findUnique({
      where: { id: normalizedBindingId },
      select: bindingSelect,
    });

    if (!binding) {
      throw new NotFoundException('3D-binding не найден');
    }

    return binding;
  }

  async create(input: CreateProject3DBindingInput) {
    const projectId = this.normalizeRequiredText(input.projectId, 'projectId');
    const nodeKey = this.normalizeRequiredText(input.nodeKey, 'nodeKey');

    await this.ensureProjectExists(projectId);

    const isPrimary = input.isPrimary ?? true;
    const canonicalRefs = await this.resolveCanonicalTargetRefs(
      projectId,
      input.targetType,
      {
        buildingId: input.buildingId,
        sectionId: input.sectionId,
        floorId: input.floorId,
        unitId: input.unitId,
      },
    );

    return this.prisma.$transaction(async (tx) => {
      if (
        input.targetType === Project3DBindingTargetType.UNIT &&
        canonicalRefs.unitId &&
        isPrimary
      ) {
        await this.dropOtherPrimaryUnitBindings(tx, canonicalRefs.unitId);
      }

      const created = await tx.project3DBinding.create({
        data: {
          projectId,
          targetType: input.targetType,
          buildingId: canonicalRefs.buildingId,
          sectionId: canonicalRefs.sectionId,
          floorId: canonicalRefs.floorId,
          unitId: canonicalRefs.unitId,
          nodeKey,
          nodeName: this.normalizeNullableText(input.nodeName) ?? null,
          nodePath: this.normalizeNullableText(input.nodePath) ?? null,
          groupName: this.normalizeNullableText(input.groupName) ?? null,
          materialName: this.normalizeNullableText(input.materialName) ?? null,
          isPrimary,
          metaJson: this.toJsonValue(input.metaJson),
        },
        select: bindingSelect,
      });

      if (
        created.targetType === Project3DBindingTargetType.UNIT &&
        created.unitId &&
        created.isPrimary
      ) {
        await this.syncUnitRuntimeModelElementKey(
          tx,
          created.unitId,
          created.nodeKey,
        );
      }

      return created;
    });
  }

  async update(bindingId: string, input: UpdateProject3DBindingInput) {
    const existing = await this.getBindingOrThrow(bindingId);

    const targetType = input.targetType ?? existing.targetType;
    const nodeKey =
      input.nodeKey !== undefined
        ? this.normalizeRequiredText(input.nodeKey, 'nodeKey')
        : existing.nodeKey;
    const isPrimary = input.isPrimary ?? existing.isPrimary;

    const canonicalRefs = await this.resolveCanonicalTargetRefs(
      existing.projectId,
      targetType,
      {
        buildingId:
          input.buildingId !== undefined ? input.buildingId : existing.buildingId,
        sectionId:
          input.sectionId !== undefined ? input.sectionId : existing.sectionId,
        floorId:
          input.floorId !== undefined ? input.floorId : existing.floorId,
        unitId: input.unitId !== undefined ? input.unitId : existing.unitId,
      },
    );

    return this.prisma.$transaction(async (tx) => {
      if (
        targetType === Project3DBindingTargetType.UNIT &&
        canonicalRefs.unitId &&
        isPrimary
      ) {
        await this.dropOtherPrimaryUnitBindings(
          tx,
          canonicalRefs.unitId,
          existing.id,
        );
      }

      const updated = await tx.project3DBinding.update({
        where: { id: existing.id },
        data: {
          targetType,
          buildingId: canonicalRefs.buildingId,
          sectionId: canonicalRefs.sectionId,
          floorId: canonicalRefs.floorId,
          unitId: canonicalRefs.unitId,
          nodeKey,
          ...(input.nodeName !== undefined && {
            nodeName: this.normalizeNullableText(input.nodeName) ?? null,
          }),
          ...(input.nodePath !== undefined && {
            nodePath: this.normalizeNullableText(input.nodePath) ?? null,
          }),
          ...(input.groupName !== undefined && {
            groupName: this.normalizeNullableText(input.groupName) ?? null,
          }),
          ...(input.materialName !== undefined && {
            materialName: this.normalizeNullableText(input.materialName) ?? null,
          }),
          ...(input.isPrimary !== undefined && {
            isPrimary,
          }),
          ...(input.metaJson !== undefined && {
            metaJson: this.toJsonValue(input.metaJson),
          }),
        },
        select: bindingSelect,
      });

      if (existing.unitId && existing.unitId !== updated.unitId) {
        await this.syncPrimaryUnitBindingToRuntime(tx, existing.unitId);
      }

      if (
        updated.targetType === Project3DBindingTargetType.UNIT &&
        updated.unitId
      ) {
        if (updated.isPrimary) {
          await this.syncUnitRuntimeModelElementKey(
            tx,
            updated.unitId,
            updated.nodeKey,
          );
        } else {
          await this.syncPrimaryUnitBindingToRuntime(tx, updated.unitId);
        }
      }

      return updated;
    });
  }

  async remove(bindingId: string): Promise<void> {
    const existing = await this.getBindingOrThrow(bindingId);

    await this.prisma.$transaction(async (tx) => {
      await tx.project3DBinding.delete({
        where: { id: existing.id },
      });

      if (
        existing.targetType === Project3DBindingTargetType.UNIT &&
        existing.unitId &&
        existing.isPrimary
      ) {
        await this.syncPrimaryUnitBindingToRuntime(tx, existing.unitId);
      }
    });
  }

  async upsertUnitPrimaryBinding(input: UpsertUnitPrimaryBindingInput) {
    const projectId = this.normalizeRequiredText(input.projectId, 'projectId');
    const unitId = this.normalizeRequiredText(input.unitId, 'unitId');
    const nodeKey = this.normalizeRequiredText(input.nodeKey, 'nodeKey');

    await this.ensureProjectExists(projectId);
    await this.ensureUnitInProject(projectId, unitId);

    const existingPrimary = await this.prisma.project3DBinding.findFirst({
      where: {
        projectId,
        targetType: Project3DBindingTargetType.UNIT,
        unitId,
        isPrimary: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (!existingPrimary) {
      return this.create({
        projectId,
        targetType: Project3DBindingTargetType.UNIT,
        unitId,
        nodeKey,
        nodeName: input.nodeName ?? null,
        nodePath: input.nodePath ?? null,
        groupName: input.groupName ?? null,
        materialName: input.materialName ?? null,
        isPrimary: true,
        metaJson: input.metaJson,
      });
    }

    return this.update(existingPrimary.id, {
      targetType: Project3DBindingTargetType.UNIT,
      unitId,
      nodeKey,
      nodeName: input.nodeName ?? null,
      nodePath: input.nodePath ?? null,
      groupName: input.groupName ?? null,
      materialName: input.materialName ?? null,
      isPrimary: true,
      metaJson: input.metaJson,
    });
  }
}