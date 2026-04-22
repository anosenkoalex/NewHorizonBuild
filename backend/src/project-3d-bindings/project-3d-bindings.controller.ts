import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Project3DBindingTargetType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  RequireThreeDWorkspaceAccess,
} from '../auth/three-d-workspace.decorator';
import { ThreeDWorkspaceGuard } from '../auth/three-d-workspace.guard';
import {
  CreateProject3DBindingInput,
  Project3DBindingsService,
  UpdateProject3DBindingInput,
  UpsertUnitPrimaryBindingInput,
} from './project-3d-bindings.service';

interface CreateBindingBody {
  projectId?: string;
  targetType?: Project3DBindingTargetType | string;

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

interface UpdateBindingBody {
  targetType?: Project3DBindingTargetType | string;

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

interface UpsertUnitPrimaryBindingBody {
  projectId?: string;
  unitId?: string;
  nodeKey?: string;
  nodeName?: string | null;
  nodePath?: string | null;
  groupName?: string | null;
  materialName?: string | null;
  metaJson?: unknown;
}

function normalizeNullableText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    throw new BadRequestException(`${fieldName} обязателен`);
  }

  return normalized;
}

function parseEnumValue<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;

  const normalized = String(value ?? '').trim() as T;

  if (!allowedValues.includes(normalized)) {
    throw new BadRequestException(
      `Некорректный ${fieldName}. Допустимые значения: ${allowedValues.join(
        ', ',
      )}`,
    );
  }

  return normalized;
}

function normalizeTargetType(
  value: unknown,
): Project3DBindingTargetType | undefined {
  return parseEnumValue(
    value,
    'targetType',
    Object.values(Project3DBindingTargetType),
  );
}

function requireTargetType(value: unknown): Project3DBindingTargetType {
  const normalized = normalizeTargetType(value);

  if (!normalized) {
    throw new BadRequestException('targetType обязателен');
  }

  return normalized;
}

@Controller('project-3d-bindings')
@UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
@RequireThreeDWorkspaceAccess('accessWorkspace')
export class Project3DBindingsController {
  constructor(
    private readonly project3DBindingsService: Project3DBindingsService,
  ) {}

  @Get('project/:projectId')
  listByProject(@Param('projectId') projectId: string) {
    const normalizedProjectId = normalizeRequiredText(projectId, 'projectId');

    return this.project3DBindingsService.listByProject(normalizedProjectId);
  }

  @Get(':bindingId')
  findOne(@Param('bindingId') bindingId: string) {
    const normalizedBindingId = normalizeRequiredText(bindingId, 'bindingId');

    return this.project3DBindingsService.findOne(normalizedBindingId);
  }

  @Post()
  @RequireThreeDWorkspaceAccess('manageBindings')
  create(@Body() body: CreateBindingBody) {
    const payload: CreateProject3DBindingInput = {
      projectId: normalizeRequiredText(body.projectId, 'projectId'),
      targetType: requireTargetType(body.targetType),

      buildingId: normalizeNullableText(body.buildingId),
      sectionId: normalizeNullableText(body.sectionId),
      floorId: normalizeNullableText(body.floorId),
      unitId: normalizeNullableText(body.unitId),

      nodeKey: normalizeRequiredText(body.nodeKey, 'nodeKey'),
      nodeName: normalizeNullableText(body.nodeName),
      nodePath: normalizeNullableText(body.nodePath),
      groupName: normalizeNullableText(body.groupName),
      materialName: normalizeNullableText(body.materialName),

      isPrimary: body.isPrimary,
      metaJson: body.metaJson,
    };

    return this.project3DBindingsService.create(payload);
  }

  @Patch(':bindingId')
  @RequireThreeDWorkspaceAccess('manageBindings')
  update(
    @Param('bindingId') bindingId: string,
    @Body() body: UpdateBindingBody,
  ) {
    const normalizedBindingId = normalizeRequiredText(bindingId, 'bindingId');

    const payload: UpdateProject3DBindingInput = {
      ...(body.targetType !== undefined && {
        targetType: normalizeTargetType(body.targetType),
      }),

      ...(body.buildingId !== undefined && {
        buildingId: normalizeNullableText(body.buildingId),
      }),
      ...(body.sectionId !== undefined && {
        sectionId: normalizeNullableText(body.sectionId),
      }),
      ...(body.floorId !== undefined && {
        floorId: normalizeNullableText(body.floorId),
      }),
      ...(body.unitId !== undefined && {
        unitId: normalizeNullableText(body.unitId),
      }),

      ...(body.nodeKey !== undefined && {
        nodeKey: normalizeRequiredText(body.nodeKey, 'nodeKey'),
      }),
      ...(body.nodeName !== undefined && {
        nodeName: normalizeNullableText(body.nodeName),
      }),
      ...(body.nodePath !== undefined && {
        nodePath: normalizeNullableText(body.nodePath),
      }),
      ...(body.groupName !== undefined && {
        groupName: normalizeNullableText(body.groupName),
      }),
      ...(body.materialName !== undefined && {
        materialName: normalizeNullableText(body.materialName),
      }),

      ...(body.isPrimary !== undefined && {
        isPrimary: body.isPrimary,
      }),
      ...(body.metaJson !== undefined && {
        metaJson: body.metaJson,
      }),
    };

    return this.project3DBindingsService.update(normalizedBindingId, payload);
  }

  @Delete(':bindingId')
  @RequireThreeDWorkspaceAccess('manageBindings')
  async remove(@Param('bindingId') bindingId: string): Promise<void> {
    const normalizedBindingId = normalizeRequiredText(bindingId, 'bindingId');

    await this.project3DBindingsService.remove(normalizedBindingId);
  }

  @Post('unit-primary')
  @RequireThreeDWorkspaceAccess('manageBindings')
  upsertUnitPrimary(@Body() body: UpsertUnitPrimaryBindingBody) {
    const payload: UpsertUnitPrimaryBindingInput = {
      projectId: normalizeRequiredText(body.projectId, 'projectId'),
      unitId: normalizeRequiredText(body.unitId, 'unitId'),
      nodeKey: normalizeRequiredText(body.nodeKey, 'nodeKey'),
      nodeName: normalizeNullableText(body.nodeName),
      nodePath: normalizeNullableText(body.nodePath),
      groupName: normalizeNullableText(body.groupName),
      materialName: normalizeNullableText(body.materialName),
      metaJson: body.metaJson,
    };

    return this.project3DBindingsService.upsertUnitPrimaryBinding(payload);
  }
}