import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectsService, UpdateProject3DInput } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ThreeDWorkspaceGuard } from '../auth/three-d-workspace.guard';
import { RequireThreeDWorkspaceAccess } from '../auth/three-d-workspace.decorator';

type RuntimeProjectPublicShape = {
  id: string;
  name: string;
  address?: string | null;
  threeDModelUrl?: string | null;
  threeDModelFormat?: string | null;
  threeDPreviewImage?: string | null;
  threeDPreviewImageUrl?: string | null;
  previewImageUrl?: string | null;
};

const ALLOWED_3D_MODEL_EXTENSIONS = new Set([
  'obj',
  'glb',
  'gltf',
  'fbx',
]);

function normalizeNullableText(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function getFileExtension(filename: unknown): string | null {
  const name = String(filename ?? '').trim();

  if (!name || !name.includes('.')) {
    return null;
  }

  const ext = name.split('.').pop()?.toLowerCase().trim() ?? '';
  return ext || null;
}

function toPublicProject(project: RuntimeProjectPublicShape) {
  return {
    id: project.id,
    name: project.name,
    address: project.address ?? null,
    threeDModelUrl: project.threeDModelUrl ?? null,
    threeDModelFormat: project.threeDModelFormat ?? null,
    threeDPreviewImage:
      project.threeDPreviewImage ??
      project.threeDPreviewImageUrl ??
      project.previewImageUrl ??
      null,
  };
}

/**
 * Публичные проекты для телевизора / demo screen.
 * Без авторизации.
 */
@Controller('public/projects')
export class PublicProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAllPublic() {
    const list = await this.projectsService.findAll();
    return list.map((project) => toPublicProject(project));
  }

  @Get(':id')
  async findOnePublic(@Param('id') id: string) {
    const project = await this.projectsService.findOne(id);

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    return toPublicProject(project);
  }
}

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Hidden 3D workspace: список studio-проектов
   */
  @Get('studio')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('accessWorkspace')
  findAllStudio() {
    return this.projectsService.findAllStudio();
  }

  /**
   * Hidden 3D workspace: один studio-проект
   */
  @Get('studio/:id')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('accessWorkspace')
  async findOneStudio(@Param('id') id: string) {
    const project = await this.projectsService.findOneStudio(id);

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    return project;
  }

  /**
   * Обычный runtime список проектов для CRM / Viewer
   */
  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  /**
   * Обычный runtime проект для CRM / Viewer
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const project = await this.projectsService.findOne(id);

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    return project;
  }

  /**
   * Обновление runtime 3D-полей проекта
   */
  @Patch(':id/3d')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  update3D(@Param('id') id: string, @Body() body: UpdateProject3DInput) {
    const payload: UpdateProject3DInput = {
      ...(body.threeDModelUrl !== undefined && {
        threeDModelUrl: normalizeNullableText(body.threeDModelUrl),
      }),
      ...(body.threeDModelFormat !== undefined && {
        threeDModelFormat: normalizeNullableText(body.threeDModelFormat),
      }),
      ...(body.threeDPreviewImage !== undefined && {
        threeDPreviewImage: normalizeNullableText(body.threeDPreviewImage),
      }),
      ...(body.published3DAssetId !== undefined && {
        published3DAssetId: normalizeNullableText(body.published3DAssetId),
      }),
      ...(body.publishedScenePresetId !== undefined && {
        publishedScenePresetId: normalizeNullableText(
          body.publishedScenePresetId,
        ),
      }),
      ...(body.publishedCameraPresetId !== undefined && {
        publishedCameraPresetId: normalizeNullableText(
          body.publishedCameraPresetId,
        ),
      }),
    };

    return this.projectsService.update3D(id, payload);
  }

  /**
   * Publish step:
   * подтягивает output/preview из published3DAsset
   * и записывает результат в runtime-поля проекта
   * (threeDModelUrl / threeDModelFormat / threeDPreviewImage).
   */
  @Post(':id/3d/publish-resolved')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('publish')
  publishResolved3D(@Param('id') id: string) {
    return this.projectsService.publishResolved3DFromAsset(id);
  }

  /**
   * Базовая загрузка файла 3D-модели проекта.
   * Пока это простой upload в runtime-поля.
   * Позже можно увести это в полноценный asset/import pipeline.
   */
  @Post(':id/3d-model/upload')
  @UseGuards(ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('uploadModels')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: 'uploads/project-3d',
    }),
  )
  async upload3DModel(@Param('id') id: string, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Файл не получен');
    }

    const originalName = String(file.originalname ?? '').trim();
    const ext = getFileExtension(originalName);

    if (!ext || !ALLOWED_3D_MODEL_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Поддерживаются только файлы: ${Array.from(
          ALLOWED_3D_MODEL_EXTENSIONS,
        ).join(', ')}`,
      );
    }

    const filename = String(file.filename ?? '').trim();
    if (!filename) {
      throw new BadRequestException('Не удалось сохранить файл модели');
    }

    const url = `/uploads/project-3d/${filename}`;

    return this.projectsService.update3D(id, {
      threeDModelUrl: url,
      threeDModelFormat: ext,
    });
  }
}