import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetFileKind,
  ImportJobStatus,
  ImportJobType,
  Prisma,
  Project3DAssetStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateProject3DAssetInput {
  projectId: string;
  name: string;
  versionLabel?: string | null;
  sourceFormat?: string | null;
  outputFormat?: string | null;
  notes?: string | null;
}

export interface UpdateProject3DAssetInput {
  name?: string;
  versionLabel?: string | null;
  sourceFormat?: string | null;
  outputFormat?: string | null;
  notes?: string | null;
  normalizationJson?: unknown;
  diagnosticsJson?: unknown;
}

export interface AttachAssetFileInput {
  fileId: string;
  format?: string | null;
}

export interface SetProject3DAssetStatusInput {
  status: Project3DAssetStatus;
  notes?: string | null;
}

export interface CreateImportJobInput {
  type: ImportJobType;
  payloadJson?: unknown;
}

const assetSelect = {
  id: true,
  projectId: true,
  name: true,
  versionLabel: true,
  sourceFormat: true,
  outputFormat: true,
  status: true,
  notes: true,
  normalizationJson: true,
  diagnosticsJson: true,
  isPublished: true,
  sourceFileId: true,
  outputFileId: true,
  previewFileId: true,
  createdAt: true,
  updatedAt: true,
  sourceFile: {
    select: {
      id: true,
      kind: true,
      originalName: true,
      mimeType: true,
      extension: true,
      sizeBytes: true,
      storagePath: true,
      publicUrl: true,
      checksum: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  outputFile: {
    select: {
      id: true,
      kind: true,
      originalName: true,
      mimeType: true,
      extension: true,
      sizeBytes: true,
      storagePath: true,
      publicUrl: true,
      checksum: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  previewFile: {
    select: {
      id: true,
      kind: true,
      originalName: true,
      mimeType: true,
      extension: true,
      sizeBytes: true,
      storagePath: true,
      publicUrl: true,
      checksum: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

const importJobSelect = {
  id: true,
  type: true,
  status: true,
  payloadJson: true,
  resultJson: true,
  errorText: true,
  startedAt: true,
  finishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class Project3DAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeNullableText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const normalized = String(value).trim();
    return normalized || null;
  }

  private normalizeRequiredText(value: string, fieldLabel: string): string {
    const normalized = String(value ?? '').trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldLabel} не может быть пустым`);
    }

    return normalized;
  }

  private toJsonValue(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private inferFormatFromExtension(extension?: string | null): string | null {
    const ext = String(extension ?? '').trim().toLowerCase();
    return ext || null;
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

  private async ensureAssetExists(assetId: string): Promise<void> {
    const normalizedAssetId = this.normalizeRequiredText(assetId, 'assetId');

    const asset = await this.prisma.project3DAsset.findUnique({
      where: { id: normalizedAssetId },
      select: { id: true },
    });

    if (!asset) {
      throw new NotFoundException('3D-ассет не найден');
    }
  }

  private async getAssetOrThrow(assetId: string) {
    const normalizedAssetId = this.normalizeRequiredText(assetId, 'assetId');

    const asset = await this.prisma.project3DAsset.findUnique({
      where: { id: normalizedAssetId },
      select: {
        id: true,
        projectId: true,
        status: true,
        isPublished: true,
        outputFileId: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('3D-ассет не найден');
    }

    return asset;
  }

  private async ensureFileExists(
    fileId: string,
    allowedKinds?: AssetFileKind[],
  ): Promise<{
    id: string;
    kind: AssetFileKind;
    extension: string | null;
  }> {
    const normalizedFileId = this.normalizeRequiredText(fileId, 'fileId');

    const file = await this.prisma.assetFile.findUnique({
      where: { id: normalizedFileId },
      select: { id: true, kind: true, extension: true },
    });

    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    if (
      allowedKinds &&
      allowedKinds.length > 0 &&
      !allowedKinds.includes(file.kind)
    ) {
      throw new BadRequestException(
        'Файл имеет неподходящий тип для этой операции',
      );
    }

    return file;
  }

  async listByProject(projectId: string) {
    const normalizedProjectId = this.normalizeRequiredText(
      projectId,
      'projectId',
    );

    await this.ensureProjectExists(normalizedProjectId);

    return this.prisma.project3DAsset.findMany({
      where: { projectId: normalizedProjectId },
      select: assetSelect,
      orderBy: [{ isPublished: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(assetId: string) {
    const normalizedAssetId = this.normalizeRequiredText(assetId, 'assetId');

    const asset = await this.prisma.project3DAsset.findUnique({
      where: { id: normalizedAssetId },
      select: {
        ...assetSelect,
        importJobs: {
          select: importJobSelect,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('3D-ассет не найден');
    }

    return asset;
  }

  async createDraft(input: CreateProject3DAssetInput) {
    const projectId = this.normalizeRequiredText(input.projectId, 'projectId');
    const name = this.normalizeRequiredText(input.name, 'Название ассета');

    await this.ensureProjectExists(projectId);

    return this.prisma.project3DAsset.create({
      data: {
        projectId,
        name,
        versionLabel: this.normalizeNullableText(input.versionLabel) ?? null,
        sourceFormat: this.normalizeNullableText(input.sourceFormat) ?? null,
        outputFormat: this.normalizeNullableText(input.outputFormat) ?? null,
        notes: this.normalizeNullableText(input.notes) ?? null,
        status: Project3DAssetStatus.DRAFT,
        isPublished: false,
      },
      select: assetSelect,
    });
  }

  async update(assetId: string, input: UpdateProject3DAssetInput) {
    const normalizedAssetId = this.normalizeRequiredText(assetId, 'assetId');

    await this.ensureAssetExists(normalizedAssetId);

    const data: Prisma.Project3DAssetUpdateInput = {};

    if (input.name !== undefined) {
      data.name = this.normalizeRequiredText(input.name, 'Название ассета');
    }

    if (input.versionLabel !== undefined) {
      data.versionLabel =
        this.normalizeNullableText(input.versionLabel) ?? null;
    }

    if (input.sourceFormat !== undefined) {
      data.sourceFormat =
        this.normalizeNullableText(input.sourceFormat) ?? null;
    }

    if (input.outputFormat !== undefined) {
      data.outputFormat =
        this.normalizeNullableText(input.outputFormat) ?? null;
    }

    if (input.notes !== undefined) {
      data.notes = this.normalizeNullableText(input.notes) ?? null;
    }

    if (input.normalizationJson !== undefined) {
      data.normalizationJson = this.toJsonValue(input.normalizationJson);
    }

    if (input.diagnosticsJson !== undefined) {
      data.diagnosticsJson = this.toJsonValue(input.diagnosticsJson);
    }

    return this.prisma.project3DAsset.update({
      where: { id: normalizedAssetId },
      data,
      select: assetSelect,
    });
  }

  async attachSourceFile(assetId: string, input: AttachAssetFileInput) {
    const normalizedAssetId = this.normalizeRequiredText(assetId, 'assetId');
    const fileId = this.normalizeRequiredText(input.fileId, 'fileId');

    await this.ensureAssetExists(normalizedAssetId);

    const file = await this.ensureFileExists(fileId, [
      AssetFileKind.SOURCE_3D,
      AssetFileKind.ARCHIVE,
      AssetFileKind.OTHER,
    ]);

    const format =
      input.format !== undefined
        ? this.normalizeNullableText(input.format) ?? null
        : this.inferFormatFromExtension(file.extension);

    return this.prisma.project3DAsset.update({
      where: { id: normalizedAssetId },
      data: {
        sourceFileId: fileId,
        ...(format !== undefined && {
          sourceFormat: format,
        }),
      },
      select: assetSelect,
    });
  }

  async attachOutputFile(assetId: string, input: AttachAssetFileInput) {
    const normalizedAssetId = this.normalizeRequiredText(assetId, 'assetId');
    const fileId = this.normalizeRequiredText(input.fileId, 'fileId');

    await this.ensureAssetExists(normalizedAssetId);

    const file = await this.ensureFileExists(fileId, [
      AssetFileKind.CONVERTED_3D,
      AssetFileKind.OTHER,
    ]);

    const format =
      input.format !== undefined
        ? this.normalizeNullableText(input.format) ?? null
        : this.inferFormatFromExtension(file.extension);

    return this.prisma.project3DAsset.update({
      where: { id: normalizedAssetId },
      data: {
        outputFileId: fileId,
        ...(format !== undefined && {
          outputFormat: format,
        }),
      },
      select: assetSelect,
    });
  }

  async attachPreviewFile(assetId: string, fileId: string) {
    const normalizedAssetId = this.normalizeRequiredText(assetId, 'assetId');
    const normalizedFileId = this.normalizeRequiredText(fileId, 'fileId');

    await this.ensureAssetExists(normalizedAssetId);
    await this.ensureFileExists(normalizedFileId, [
      AssetFileKind.PREVIEW_IMAGE,
      AssetFileKind.OTHER,
    ]);

    return this.prisma.project3DAsset.update({
      where: { id: normalizedAssetId },
      data: {
        previewFileId: normalizedFileId,
      },
      select: assetSelect,
    });
  }

  async setStatus(assetId: string, input: SetProject3DAssetStatusInput) {
    const asset = await this.getAssetOrThrow(assetId);

    if (input.status === Project3DAssetStatus.PUBLISHED) {
      throw new BadRequestException(
        'Для публикации используйте отдельный publish endpoint',
      );
    }

    if (asset.isPublished) {
      throw new BadRequestException(
        'Нельзя менять статус опубликованного ассета напрямую. Сначала опубликуйте другой ассет или снимите публикацию через отдельный workflow.',
      );
    }

    return this.prisma.project3DAsset.update({
      where: { id: asset.id },
      data: {
        status: input.status,
        ...(input.notes !== undefined && {
          notes: this.normalizeNullableText(input.notes) ?? null,
        }),
      },
      select: assetSelect,
    });
  }

  async publish(assetId: string) {
    const asset = await this.getAssetOrThrow(assetId);

    if (
      asset.status !== Project3DAssetStatus.READY &&
      asset.status !== Project3DAssetStatus.PUBLISHED
    ) {
      throw new BadRequestException(
        'Публиковать можно только ассет в статусе READY',
      );
    }

    if (!asset.outputFileId) {
      throw new BadRequestException(
        'Нельзя опубликовать ассет без output file',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.project3DAsset.updateMany({
        where: {
          projectId: asset.projectId,
          id: { not: asset.id },
          isPublished: true,
        },
        data: {
          isPublished: false,
          status: Project3DAssetStatus.READY,
        },
      });

      await tx.project3DAsset.update({
        where: { id: asset.id },
        data: {
          isPublished: true,
          status: Project3DAssetStatus.PUBLISHED,
        },
      });

      await tx.project.update({
        where: { id: asset.projectId },
        data: {
          published3DAssetId: asset.id,
        },
      });
    });

    const updated = await this.prisma.project3DAsset.findUnique({
      where: { id: asset.id },
      select: assetSelect,
    });

    if (!updated) {
      throw new NotFoundException('3D-ассет не найден после публикации');
    }

    return updated;
  }

  async createImportJob(assetId: string, input: CreateImportJobInput) {
    const normalizedAssetId = this.normalizeRequiredText(assetId, 'assetId');

    const asset = await this.prisma.project3DAsset.findUnique({
      where: { id: normalizedAssetId },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('3D-ассет не найден');
    }

    return this.prisma.importJob.create({
      data: {
        type: input.type,
        status: ImportJobStatus.QUEUED,
        projectId: asset.projectId,
        project3DAssetId: asset.id,
        payloadJson:
          input.payloadJson === undefined
            ? undefined
            : this.toJsonValue(input.payloadJson),
      },
      select: importJobSelect,
    });
  }

  async listImportJobs(assetId: string) {
    const normalizedAssetId = this.normalizeRequiredText(assetId, 'assetId');

    await this.ensureAssetExists(normalizedAssetId);

    return this.prisma.importJob.findMany({
      where: {
        project3DAssetId: normalizedAssetId,
      },
      select: importJobSelect,
      orderBy: { createdAt: 'desc' },
    });
  }
}