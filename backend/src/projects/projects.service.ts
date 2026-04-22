import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpdateProject3DInput {
  threeDModelUrl?: string | null;
  threeDModelFormat?: string | null;
  threeDPreviewImage?: string | null;

  published3DAssetId?: string | null;
  publishedScenePresetId?: string | null;
  publishedCameraPresetId?: string | null;
}

const projectRuntimeSelect = {
  id: true,
  name: true,
  description: true,
  address: true,
  threeDModelUrl: true,
  threeDModelFormat: true,
  threeDPreviewImage: true,
  published3DAssetId: true,
  publishedScenePresetId: true,
  publishedCameraPresetId: true,
} as const;

const projectStudioSelect = {
  ...projectRuntimeSelect,
  _count: {
    select: {
      buildings: true,
      units: true,
      threeDAssets: true,
      scenePresets: true,
      cameraPresets: true,
      threeDBindings: true,
      importJobs: true,
    },
  },
} as const;

@Injectable()
export class ProjectsService {
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

  private normalizeNullableId(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const normalized = String(value).trim();
    return normalized || null;
  }

  private inferFormatFromUrl(url: string | null | undefined): string | null {
    const value = String(url ?? '').trim().toLowerCase();
    if (!value) return null;

    if (value.endsWith('.glb')) return 'glb';
    if (value.endsWith('.gltf')) return 'gltf';
    if (value.endsWith('.obj')) return 'obj';
    if (value.endsWith('.fbx')) return 'fbx';
    if (value.endsWith('.zip')) return 'zip';

    return null;
  }

  private resolveAssetFileUrl(file: {
    publicUrl?: string | null;
    storagePath?: string | null;
  } | null | undefined): string | null {
    return (
      this.normalizeNullableText(file?.publicUrl ?? null) ??
      this.normalizeNullableText(file?.storagePath ?? null) ??
      null
    );
  }

  private resolveAssetOutputFormat(input: {
    outputFormat?: string | null;
    outputFile?: {
      extension?: string | null;
      publicUrl?: string | null;
      storagePath?: string | null;
    } | null;
  }): string | null {
    return (
      this.normalizeNullableText(input.outputFormat ?? null) ??
      this.normalizeNullableText(input.outputFile?.extension ?? null) ??
      this.inferFormatFromUrl(this.resolveAssetFileUrl(input.outputFile)) ??
      null
    );
  }

  private async ensureProjectExists(id: string): Promise<void> {
    const normalizedId = this.normalizeId(id);

    const exists = await this.prisma.project.findUnique({
      where: { id: normalizedId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Проект не найден');
    }
  }

  private async ensureProject3DAssetBelongsToProject(
    projectId: string,
    assetId: string,
  ): Promise<void> {
    const normalizedProjectId = this.normalizeId(projectId);
    const normalizedAssetId = this.normalizeId(assetId);

    const asset = await this.prisma.project3DAsset.findFirst({
      where: {
        id: normalizedAssetId,
        projectId: normalizedProjectId,
      },
      select: { id: true },
    });

    if (!asset) {
      throw new NotFoundException(
        'Указанный 3D asset не найден в этом проекте',
      );
    }
  }

  private async ensureScenePresetBelongsToProject(
    projectId: string,
    presetId: string,
  ): Promise<void> {
    const normalizedProjectId = this.normalizeId(projectId);
    const normalizedPresetId = this.normalizeId(presetId);

    const preset = await this.prisma.project3DScenePreset.findFirst({
      where: {
        id: normalizedPresetId,
        projectId: normalizedProjectId,
      },
      select: { id: true },
    });

    if (!preset) {
      throw new NotFoundException(
        'Указанный scene preset не найден в этом проекте',
      );
    }
  }

  private async ensureCameraPresetBelongsToProject(
    projectId: string,
    presetId: string,
  ): Promise<void> {
    const normalizedProjectId = this.normalizeId(projectId);
    const normalizedPresetId = this.normalizeId(presetId);

    const preset = await this.prisma.project3DCameraPreset.findFirst({
      where: {
        id: normalizedPresetId,
        projectId: normalizedProjectId,
      },
      select: { id: true },
    });

    if (!preset) {
      throw new NotFoundException(
        'Указанный camera preset не найден в этом проекте',
      );
    }
  }

  // Список проектов для CRM и обычного Viewer
  findAll() {
    return this.prisma.project.findMany({
      select: projectRuntimeSelect,
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Детальная инфа по одному проекту
  findOne(id: string) {
    const normalizedId = this.normalizeId(id);

    return this.prisma.project.findUnique({
      where: { id: normalizedId },
      select: projectRuntimeSelect,
    });
  }

  // Hidden owner-only studio: расширенный список проектов с диагностикой
  findAllStudio() {
    return this.prisma.project.findMany({
      select: projectStudioSelect,
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Hidden owner-only studio: один проект с расширенной диагностикой
  findOneStudio(id: string) {
    const normalizedId = this.normalizeId(id);

    return this.prisma.project.findUnique({
      where: { id: normalizedId },
      select: {
        ...projectStudioSelect,
        buildings: {
          select: {
            id: true,
            label: true,
            numberOfFloors: true,
          },
          orderBy: {
            label: 'asc',
          },
        },
        threeDAssets: {
          select: {
            id: true,
            name: true,
            versionLabel: true,
            sourceFormat: true,
            outputFormat: true,
            status: true,
            isPublished: true,
            createdAt: true,
            updatedAt: true,
            sourceFile: {
              select: {
                id: true,
                kind: true,
                originalName: true,
                publicUrl: true,
                storagePath: true,
                extension: true,
              },
            },
            outputFile: {
              select: {
                id: true,
                kind: true,
                originalName: true,
                publicUrl: true,
                storagePath: true,
                extension: true,
              },
            },
            previewFile: {
              select: {
                id: true,
                kind: true,
                originalName: true,
                publicUrl: true,
                storagePath: true,
                extension: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        scenePresets: {
          select: {
            id: true,
            name: true,
            isDefault: true,
            isPublished: true,
            backgroundColor: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        cameraPresets: {
          select: {
            id: true,
            name: true,
            isDefault: true,
            scenePresetId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        threeDBindings: {
          select: {
            id: true,
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
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        importJobs: {
          select: {
            id: true,
            type: true,
            status: true,
            errorText: true,
            startedAt: true,
            finishedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  // Обновление runtime 3D-полей проекта
  async update3D(id: string, data: UpdateProject3DInput) {
    const normalizedId = this.normalizeId(id);
    await this.ensureProjectExists(normalizedId);

    const normalizedPublished3DAssetId = this.normalizeNullableId(
      data.published3DAssetId,
    );
    const normalizedPublishedScenePresetId = this.normalizeNullableId(
      data.publishedScenePresetId,
    );
    const normalizedPublishedCameraPresetId = this.normalizeNullableId(
      data.publishedCameraPresetId,
    );

    if (normalizedPublished3DAssetId) {
      await this.ensureProject3DAssetBelongsToProject(
        normalizedId,
        normalizedPublished3DAssetId,
      );
    }

    if (normalizedPublishedScenePresetId) {
      await this.ensureScenePresetBelongsToProject(
        normalizedId,
        normalizedPublishedScenePresetId,
      );
    }

    if (normalizedPublishedCameraPresetId) {
      await this.ensureCameraPresetBelongsToProject(
        normalizedId,
        normalizedPublishedCameraPresetId,
      );
    }

    const updateData: Record<string, unknown> = {};

    const normalizedModelUrl =
      'threeDModelUrl' in data
        ? this.normalizeNullableText(data.threeDModelUrl) ?? null
        : undefined;

    const normalizedModelFormat =
      'threeDModelFormat' in data
        ? this.normalizeNullableText(data.threeDModelFormat) ?? null
        : undefined;

    if ('threeDModelUrl' in data) {
      updateData.threeDModelUrl = normalizedModelUrl;

      if (!('threeDModelFormat' in data)) {
        updateData.threeDModelFormat = normalizedModelUrl
          ? this.inferFormatFromUrl(normalizedModelUrl)
          : null;
      }
    }

    if ('threeDModelFormat' in data) {
      updateData.threeDModelFormat = normalizedModelFormat;
    }

    if ('threeDPreviewImage' in data) {
      updateData.threeDPreviewImage =
        this.normalizeNullableText(data.threeDPreviewImage) ?? null;
    }

    if ('published3DAssetId' in data) {
      updateData.published3DAssetId = normalizedPublished3DAssetId ?? null;
    }

    if ('publishedScenePresetId' in data) {
      updateData.publishedScenePresetId =
        normalizedPublishedScenePresetId ?? null;
    }

    if ('publishedCameraPresetId' in data) {
      updateData.publishedCameraPresetId =
        normalizedPublishedCameraPresetId ?? null;
    }

    return this.prisma.project.update({
      where: { id: normalizedId },
      data: updateData,
      select: projectRuntimeSelect,
    });
  }

  /**
   * Hidden 3D studio publish step:
   * берёт опубликованный Project3DAsset и переносит его output/preview в runtime-поля проекта,
   * чтобы обычный Viewer работал с готовым published-результатом.
   */
  async publishResolved3DFromAsset(id: string) {
    const normalizedId = this.normalizeId(id);

    const project = await this.prisma.project.findUnique({
      where: { id: normalizedId },
      select: {
        id: true,
        published3DAssetId: true,
        published3DAsset: {
          select: {
            id: true,
            outputFormat: true,
            outputFile: {
              select: {
                publicUrl: true,
                storagePath: true,
                extension: true,
              },
            },
            previewFile: {
              select: {
                publicUrl: true,
                storagePath: true,
                extension: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    if (!project.published3DAssetId || !project.published3DAsset) {
      throw new NotFoundException(
        'Для проекта не назначен опубликованный 3D-ассет',
      );
    }

    const modelUrl = this.resolveAssetFileUrl(
      project.published3DAsset.outputFile,
    );

    if (!modelUrl) {
      throw new NotFoundException(
        'У опубликованного 3D-ассета нет output-файла для Viewer',
      );
    }

    const previewUrl = this.resolveAssetFileUrl(
      project.published3DAsset.previewFile,
    );

    const modelFormat = this.resolveAssetOutputFormat(
      project.published3DAsset,
    );

    return this.prisma.project.update({
      where: { id: normalizedId },
      data: {
        threeDModelUrl: modelUrl,
        threeDModelFormat: modelFormat,
        threeDPreviewImage: previewUrl,
      },
      select: projectRuntimeSelect,
    });
  }
}