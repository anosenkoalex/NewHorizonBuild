import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ImportJobType, Project3DAssetStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  RequireThreeDWorkspaceAccess,
} from '../auth/three-d-workspace.decorator';
import { ThreeDWorkspaceGuard } from '../auth/three-d-workspace.guard';
import {
  AttachAssetFileInput,
  CreateImportJobInput,
  CreateProject3DAssetInput,
  Project3DAssetsService,
  SetProject3DAssetStatusInput,
  UpdateProject3DAssetInput,
} from './project-3d-assets.service';

interface CreateDraftBody {
  projectId?: string;
  name?: string;
  versionLabel?: string | null;
  sourceFormat?: string | null;
  outputFormat?: string | null;
  notes?: string | null;
}

interface UpdateAssetBody {
  name?: string | null;
  versionLabel?: string | null;
  sourceFormat?: string | null;
  outputFormat?: string | null;
  notes?: string | null;
  normalizationJson?: unknown;
  diagnosticsJson?: unknown;
}

interface AttachFileBody {
  fileId?: string;
  format?: string | null;
}

interface AttachPreviewFileBody {
  fileId?: string;
}

interface SetStatusBody {
  status?: Project3DAssetStatus | string;
  notes?: string | null;
}

interface CreateImportJobBody {
  type?: ImportJobType | string;
  payloadJson?: unknown;
}

function normalizeNullableText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeRequiredText(value: unknown, fieldLabel: string): string {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    throw new BadRequestException(`${fieldLabel} обязателен`);
  }

  return normalized;
}

function parseEnumValue<T extends string>(
  value: unknown,
  fieldLabel: string,
  allowedValues: readonly T[],
): T {
  const normalized = normalizeRequiredText(value, fieldLabel) as T;

  if (!allowedValues.includes(normalized)) {
    throw new BadRequestException(
      `Некорректный ${fieldLabel}. Допустимые значения: ${allowedValues.join(
        ', ',
      )}`,
    );
  }

  return normalized;
}

@Controller('project-3d-assets')
@UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
@RequireThreeDWorkspaceAccess('accessWorkspace')
export class Project3DAssetsController {
  constructor(
    private readonly project3DAssetsService: Project3DAssetsService,
  ) {}

  @Get('project/:projectId')
  listByProject(@Param('projectId') projectId: string) {
    const normalizedProjectId = normalizeRequiredText(projectId, 'projectId');

    return this.project3DAssetsService.listByProject(normalizedProjectId);
  }

  @Get(':assetId')
  findOne(@Param('assetId') assetId: string) {
    const normalizedAssetId = normalizeRequiredText(assetId, 'assetId');

    return this.project3DAssetsService.findOne(normalizedAssetId);
  }

  @Post()
  @RequireThreeDWorkspaceAccess('uploadModels')
  createDraft(@Body() body: CreateDraftBody) {
    const payload: CreateProject3DAssetInput = {
      projectId: normalizeRequiredText(body?.projectId, 'projectId'),
      name: normalizeRequiredText(body?.name, 'name'),
      versionLabel: normalizeNullableText(body?.versionLabel),
      sourceFormat: normalizeNullableText(body?.sourceFormat),
      outputFormat: normalizeNullableText(body?.outputFormat),
      notes: normalizeNullableText(body?.notes),
    };

    return this.project3DAssetsService.createDraft(payload);
  }

  @Patch(':assetId')
  @RequireThreeDWorkspaceAccess('uploadModels')
  update(@Param('assetId') assetId: string, @Body() body: UpdateAssetBody) {
    const normalizedAssetId = normalizeRequiredText(assetId, 'assetId');

    if (body.name !== undefined && !String(body.name ?? '').trim()) {
      throw new BadRequestException('name не может быть пустым');
    }

    const payload: UpdateProject3DAssetInput = {
      ...(body.name !== undefined && {
        name: String(body.name ?? '').trim(),
      }),
      ...(body.versionLabel !== undefined && {
        versionLabel: normalizeNullableText(body.versionLabel),
      }),
      ...(body.sourceFormat !== undefined && {
        sourceFormat: normalizeNullableText(body.sourceFormat),
      }),
      ...(body.outputFormat !== undefined && {
        outputFormat: normalizeNullableText(body.outputFormat),
      }),
      ...(body.notes !== undefined && {
        notes: normalizeNullableText(body.notes),
      }),
      ...(body.normalizationJson !== undefined && {
        normalizationJson: body.normalizationJson,
      }),
      ...(body.diagnosticsJson !== undefined && {
        diagnosticsJson: body.diagnosticsJson,
      }),
    };

    return this.project3DAssetsService.update(normalizedAssetId, payload);
  }

  @Post(':assetId/source-file')
  @RequireThreeDWorkspaceAccess('uploadModels')
  attachSourceFile(
    @Param('assetId') assetId: string,
    @Body() body: AttachFileBody,
  ) {
    const normalizedAssetId = normalizeRequiredText(assetId, 'assetId');

    const payload: AttachAssetFileInput = {
      fileId: normalizeRequiredText(body?.fileId, 'fileId'),
      format: normalizeNullableText(body?.format),
    };

    return this.project3DAssetsService.attachSourceFile(
      normalizedAssetId,
      payload,
    );
  }

  @Post(':assetId/output-file')
  @RequireThreeDWorkspaceAccess('uploadModels')
  attachOutputFile(
    @Param('assetId') assetId: string,
    @Body() body: AttachFileBody,
  ) {
    const normalizedAssetId = normalizeRequiredText(assetId, 'assetId');

    const payload: AttachAssetFileInput = {
      fileId: normalizeRequiredText(body?.fileId, 'fileId'),
      format: normalizeNullableText(body?.format),
    };

    return this.project3DAssetsService.attachOutputFile(
      normalizedAssetId,
      payload,
    );
  }

  @Post(':assetId/preview-file')
  @RequireThreeDWorkspaceAccess('uploadModels')
  attachPreviewFile(
    @Param('assetId') assetId: string,
    @Body() body: AttachPreviewFileBody,
  ) {
    const normalizedAssetId = normalizeRequiredText(assetId, 'assetId');
    const fileId = normalizeRequiredText(body?.fileId, 'fileId');

    return this.project3DAssetsService.attachPreviewFile(
      normalizedAssetId,
      fileId,
    );
  }

  @Post(':assetId/status')
  @RequireThreeDWorkspaceAccess('manageScenes')
  setStatus(@Param('assetId') assetId: string, @Body() body: SetStatusBody) {
    const normalizedAssetId = normalizeRequiredText(assetId, 'assetId');
    const allowedStatuses = Object.values(Project3DAssetStatus);
    const status = parseEnumValue(body?.status, 'status', allowedStatuses);

    const payload: SetProject3DAssetStatusInput = {
      status,
      notes: normalizeNullableText(body?.notes),
    };

    return this.project3DAssetsService.setStatus(normalizedAssetId, payload);
  }

  @Post(':assetId/publish')
  @RequireThreeDWorkspaceAccess('publish')
  publish(@Param('assetId') assetId: string) {
    const normalizedAssetId = normalizeRequiredText(assetId, 'assetId');

    return this.project3DAssetsService.publish(normalizedAssetId);
  }

  @Get(':assetId/import-jobs')
  listImportJobs(@Param('assetId') assetId: string) {
    const normalizedAssetId = normalizeRequiredText(assetId, 'assetId');

    return this.project3DAssetsService.listImportJobs(normalizedAssetId);
  }

  @Post(':assetId/import-jobs')
  @RequireThreeDWorkspaceAccess('uploadModels')
  createImportJob(
    @Param('assetId') assetId: string,
    @Body() body: CreateImportJobBody,
  ) {
    const normalizedAssetId = normalizeRequiredText(assetId, 'assetId');
    const allowedTypes = Object.values(ImportJobType);
    const type = parseEnumValue(body?.type, 'type', allowedTypes);

    const payload: CreateImportJobInput = {
      type,
      payloadJson: body?.payloadJson,
    };

    return this.project3DAssetsService.createImportJob(
      normalizedAssetId,
      payload,
    );
  }
}