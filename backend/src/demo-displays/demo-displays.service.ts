import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DemoDisplay, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDemoDisplayInput {
  name: string;
  office?: string | null;
}

export interface UpdateDemoDisplayInput {
  name?: string;
  office?: string | null;
  isActive?: boolean;

  demoEnabled?: boolean;
  presenterUserId?: string | null;
  lastViewerActivityAt?: Date | string | null;

  currentProjectId?: string | null;
  currentUnitId?: string | null;

  autoplayEnabled?: boolean;
  autoplayProjectId?: string | null;
  autoplayDelaySec?: number | null;
}

export interface ShowOnDemoInput {
  projectId: string;
  unitId?: string | null;
}

export interface SetAutoplayInput {
  enabled: boolean;
  autoplayProjectId?: string | null;
  autoplayDelaySec?: number | null;
}

export interface AssignPresenterInput {
  presenterUserId: string | null;
}

export interface ToggleDemoModeInput {
  enabled: boolean;
}

export interface SyncViewerStateInput {
  presenterUserId: string;
  projectId?: string | null;
  unitId?: string | null;
  liveMode: boolean;
}

const VIEWER_ACTIVITY_STALE_MS = 60_000;

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class DemoDisplaysService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeRequiredText(value: unknown, fieldName: string): string {
    const normalized = String(value ?? '').trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} обязателен`);
    }

    return normalized;
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
    return this.normalizeNullableText(value);
  }

  private normalizeName(value: unknown): string {
    return this.normalizeRequiredText(value, 'name');
  }

  private normalizeAutoplayDelay(
    value: number | null | undefined,
  ): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    if (!Number.isFinite(value)) {
      throw new BadRequestException('autoplayDelaySec должен быть числом');
    }

    const normalized = Math.round(Number(value));

    if (normalized < 0) {
      throw new BadRequestException('autoplayDelaySec должен быть >= 0');
    }

    return normalized;
  }

  private generateCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let i = 0; i < 6; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    return code;
  }

  private async ensureUniqueCode(): Promise<string> {
    for (;;) {
      const code = this.generateCode();

      const exists = await this.prisma.demoDisplay.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!exists) return code;
    }
  }

  private async ensureProjectExists(projectId: string): Promise<string> {
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

    return project.id;
  }

  private async ensureUnitExists(unitId: string): Promise<{
    id: string;
    projectId: string;
  }> {
    const normalizedUnitId = this.normalizeRequiredText(unitId, 'unitId');

    const unit = await this.prisma.unit.findUnique({
      where: { id: normalizedUnitId },
      select: { id: true, projectId: true },
    });

    if (!unit) {
      throw new NotFoundException('Юнит не найден');
    }

    return unit;
  }

  private async ensureUserExists(userId: string): Promise<string> {
    const normalizedUserId = this.normalizeRequiredText(userId, 'userId');

    const user = await this.prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user.id;
  }

  private normalizeNullableDate(
    value: Date | string | null | undefined,
  ): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (value instanceof Date) return value;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private isViewerActivityFresh(
    value: Date | string | null | undefined,
  ): boolean {
    if (!value) return false;

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return Date.now() - date.getTime() < VIEWER_ACTIVITY_STALE_MS;
  }

  private toPublicDisplay(display: DemoDisplay): DemoDisplay {
    const liveRequested = !!(display.currentProjectId || display.currentUnitId);

    if (!display.isActive) {
      return {
        ...display,
        currentProjectId: null,
        currentUnitId: null,
      };
    }

    if (!display.demoEnabled) {
      return {
        ...display,
        currentProjectId: null,
        currentUnitId: null,
      };
    }

    if (!liveRequested) {
      return display;
    }

    const liveFresh = this.isViewerActivityFresh(display.lastViewerActivityAt);

    if (liveFresh) {
      return display;
    }

    return {
      ...display,
      currentProjectId: null,
      currentUnitId: null,
      autoplayEnabled: true,
    };
  }

  private async releasePresenterFromOtherDisplays(
    db: DbClient,
    presenterUserId: string,
    excludeDisplayId?: string,
  ): Promise<void> {
    await db.demoDisplay.updateMany({
      where: {
        presenterUserId,
        ...(excludeDisplayId
          ? {
              id: {
                not: excludeDisplayId,
              },
            }
          : {}),
      },
      data: {
        presenterUserId: null,
        demoEnabled: false,
        lastViewerActivityAt: null,
        currentProjectId: null,
        currentUnitId: null,
      },
    });
  }

  async create(data: CreateDemoDisplayInput): Promise<DemoDisplay> {
    const code = await this.ensureUniqueCode();
    const name = this.normalizeName(data.name);

    return this.prisma.demoDisplay.create({
      data: {
        name,
        office: this.normalizeNullableText(data.office) ?? null,
        code,
        isActive: true,
        demoEnabled: false,
        presenterUserId: null,
      },
    });
  }

  async createForPresenter(
    presenterUserId: string,
    data: CreateDemoDisplayInput,
  ): Promise<DemoDisplay> {
    const validUserId = await this.ensureUserExists(presenterUserId);
    const name = this.normalizeName(data.name);
    const code = await this.ensureUniqueCode();

    return this.prisma.$transaction(async (tx) => {
      await this.releasePresenterFromOtherDisplays(tx, validUserId);

      return tx.demoDisplay.create({
        data: {
          name,
          office: this.normalizeNullableText(data.office) ?? null,
          code,
          isActive: true,
          demoEnabled: false,
          presenterUserId: validUserId,
        },
      });
    });
  }

  async findAll(): Promise<DemoDisplay[]> {
    return this.prisma.demoDisplay.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string): Promise<DemoDisplay> {
    const normalizedId = this.normalizeRequiredText(id, 'id');

    const display = await this.prisma.demoDisplay.findUnique({
      where: { id: normalizedId },
    });

    if (!display) {
      throw new NotFoundException('Демо-дисплей не найден');
    }

    return display;
  }

  async findByPresenterUserId(userId: string): Promise<DemoDisplay | null> {
    const validUserId = await this.ensureUserExists(userId);

    return this.prisma.demoDisplay.findFirst({
      where: {
        presenterUserId: validUserId,
      },
      orderBy: [{ demoEnabled: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findByPresenterUserIdOrThrow(userId: string): Promise<DemoDisplay> {
    const display = await this.findByPresenterUserId(userId);

    if (!display) {
      throw new NotFoundException('Для сотрудника demo-экран не найден');
    }

    return display;
  }

  async update(
    id: string,
    data: UpdateDemoDisplayInput,
  ): Promise<DemoDisplay> {
    const normalizedId = this.normalizeRequiredText(id, 'id');
    const existing = await this.findOne(normalizedId);

    const normalizedCurrentProjectId =
      data.currentProjectId !== undefined
        ? this.normalizeNullableId(data.currentProjectId)
        : undefined;

    const normalizedCurrentUnitId =
      data.currentUnitId !== undefined
        ? this.normalizeNullableId(data.currentUnitId)
        : undefined;

    const normalizedAutoplayProjectId =
      data.autoplayProjectId !== undefined
        ? this.normalizeNullableId(data.autoplayProjectId)
        : undefined;

    if (normalizedCurrentProjectId) {
      await this.ensureProjectExists(normalizedCurrentProjectId);
    }

    if (normalizedAutoplayProjectId) {
      await this.ensureProjectExists(normalizedAutoplayProjectId);
    }

    const effectiveProjectId =
      normalizedCurrentProjectId !== undefined
        ? normalizedCurrentProjectId
        : existing.currentProjectId;

    if (normalizedCurrentUnitId) {
      const unit = await this.ensureUnitExists(normalizedCurrentUnitId);

      if (effectiveProjectId && unit.projectId !== effectiveProjectId) {
        throw new NotFoundException('Юнит не принадлежит указанному проекту');
      }
    }

    let normalizedPresenterUserId: string | null | undefined = undefined;

    if (data.presenterUserId !== undefined) {
      const requestedPresenterId = this.normalizeNullableId(data.presenterUserId);

      if (!requestedPresenterId) {
        normalizedPresenterUserId = null;
      } else {
        normalizedPresenterUserId = await this.ensureUserExists(
          requestedPresenterId,
        );
      }
    }

    const normalizedName =
      data.name !== undefined ? this.normalizeName(data.name) : undefined;

    const normalizedOffice =
      data.office !== undefined
        ? this.normalizeNullableText(data.office) ?? null
        : undefined;

    const normalizedDelay =
      data.autoplayDelaySec !== undefined
        ? this.normalizeAutoplayDelay(data.autoplayDelaySec)
        : undefined;

    return this.prisma.$transaction(async (tx) => {
      if (normalizedPresenterUserId) {
        await this.releasePresenterFromOtherDisplays(
          tx,
          normalizedPresenterUserId,
          normalizedId,
        );
      }

      const updateData: Prisma.DemoDisplayUncheckedUpdateInput = {
        ...(normalizedName !== undefined && { name: normalizedName }),
        ...(normalizedOffice !== undefined && { office: normalizedOffice }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),

        ...(data.demoEnabled !== undefined && { demoEnabled: data.demoEnabled }),
        ...(normalizedPresenterUserId !== undefined && {
          presenterUserId: normalizedPresenterUserId,
        }),
        ...(data.lastViewerActivityAt !== undefined && {
          lastViewerActivityAt: this.normalizeNullableDate(
            data.lastViewerActivityAt,
          ),
        }),

        ...(normalizedCurrentProjectId !== undefined && {
          currentProjectId: normalizedCurrentProjectId,
        }),
        ...(normalizedCurrentUnitId !== undefined && {
          currentUnitId: normalizedCurrentUnitId,
        }),

        ...(data.autoplayEnabled !== undefined && {
          autoplayEnabled: data.autoplayEnabled,
        }),
        ...(normalizedAutoplayProjectId !== undefined && {
          autoplayProjectId: normalizedAutoplayProjectId,
        }),
        ...(normalizedDelay !== undefined && {
          autoplayDelaySec: normalizedDelay,
        }),
      };

      if (normalizedPresenterUserId === null) {
        updateData.presenterUserId = null;
        updateData.demoEnabled = false;
        updateData.lastViewerActivityAt = null;
        updateData.currentProjectId = null;
        updateData.currentUnitId = null;
      }

      if (data.isActive === false) {
        updateData.demoEnabled = false;
        updateData.currentProjectId = null;
        updateData.currentUnitId = null;
      }

      if (data.demoEnabled === false) {
        updateData.currentProjectId = null;
        updateData.currentUnitId = null;
      }

      return tx.demoDisplay.update({
        where: { id: normalizedId },
        data: updateData,
      });
    });
  }

  async remove(id: string): Promise<void> {
    const normalizedId = this.normalizeRequiredText(id, 'id');

    await this.findOne(normalizedId);

    await this.prisma.demoDisplay.delete({
      where: { id: normalizedId },
    });
  }

  // ===== Сотрудник ↔ demo display =====

  async assignPresenter(
    id: string,
    data: AssignPresenterInput,
  ): Promise<DemoDisplay> {
    const normalizedId = this.normalizeRequiredText(id, 'id');
    await this.findOne(normalizedId);

    const requestedPresenterId = this.normalizeNullableId(data.presenterUserId);

    if (!requestedPresenterId) {
      return this.prisma.demoDisplay.update({
        where: { id: normalizedId },
        data: {
          presenterUserId: null,
          demoEnabled: false,
          lastViewerActivityAt: null,
          currentProjectId: null,
          currentUnitId: null,
        },
      });
    }

    const presenterUserId = await this.ensureUserExists(requestedPresenterId);

    return this.prisma.$transaction(async (tx) => {
      await this.releasePresenterFromOtherDisplays(tx, presenterUserId, normalizedId);

      return tx.demoDisplay.update({
        where: { id: normalizedId },
        data: {
          presenterUserId,
        },
      });
    });
  }

  async upsertPresenterDisplay(
    presenterUserId: string,
    data: CreateDemoDisplayInput,
  ): Promise<DemoDisplay> {
    const validUserId = await this.ensureUserExists(presenterUserId);
    const existing = await this.findByPresenterUserId(validUserId);

    if (!existing) {
      return this.createForPresenter(validUserId, data);
    }

    return this.update(existing.id, {
      name: data.name,
      office: data.office ?? null,
      presenterUserId: validUserId,
    });
  }

  async setDemoEnabled(
    id: string,
    data: ToggleDemoModeInput,
  ): Promise<DemoDisplay> {
    const normalizedId = this.normalizeRequiredText(id, 'id');
    const existing = await this.findOne(normalizedId);

    return this.prisma.demoDisplay.update({
      where: { id: normalizedId },
      data: {
        demoEnabled: data.enabled,
        presenterUserId: existing.presenterUserId,
        lastViewerActivityAt: data.enabled ? new Date() : null,
        autoplayEnabled: data.enabled ? true : existing.autoplayEnabled,
        currentProjectId: null,
        currentUnitId: null,
      },
    });
  }

  async touchViewerActivity(id: string): Promise<DemoDisplay> {
    const normalizedId = this.normalizeRequiredText(id, 'id');
    await this.findOne(normalizedId);

    return this.prisma.demoDisplay.update({
      where: { id: normalizedId },
      data: {
        lastViewerActivityAt: new Date(),
      },
    });
  }

  /**
   * liveMode = true:
   * - demoEnabled = true
   * - autoplayEnabled = false
   * - currentProjectId/currentUnitId выставляются
   *
   * liveMode = false:
   * - demoEnabled остаётся true
   * - экран уходит из live обратно в autoplay
   */
  async syncViewerState(
    id: string,
    data: SyncViewerStateInput,
  ): Promise<DemoDisplay> {
    const normalizedId = this.normalizeRequiredText(id, 'id');
    const existing = await this.findOne(normalizedId);

    if (
      existing.presenterUserId &&
      existing.presenterUserId !== data.presenterUserId
    ) {
      throw new ForbiddenException('Экран привязан к другому сотруднику');
    }

    const presenterUserId = await this.ensureUserExists(data.presenterUserId);

    let currentProjectId: string | null = null;
    let currentUnitId: string | null = null;

    if (data.liveMode) {
      const requestedProjectId = this.normalizeNullableId(data.projectId);
      const requestedUnitId = this.normalizeNullableId(data.unitId);

      if (requestedProjectId) {
        currentProjectId = await this.ensureProjectExists(requestedProjectId);
      }

      if (requestedUnitId) {
        const unit = await this.ensureUnitExists(requestedUnitId);

        if (currentProjectId && unit.projectId !== currentProjectId) {
          throw new NotFoundException('Юнит не принадлежит указанному проекту');
        }

        currentUnitId = unit.id;

        if (!currentProjectId) {
          currentProjectId = unit.projectId;
        }
      }
    }

    return this.prisma.demoDisplay.update({
      where: { id: normalizedId },
      data: {
        presenterUserId,
        demoEnabled: true,
        lastViewerActivityAt: new Date(),

        autoplayEnabled: data.liveMode ? false : true,
        currentProjectId: data.liveMode ? currentProjectId : null,
        currentUnitId: data.liveMode ? currentUnitId : null,
      },
    });
  }

  // ===== Управляющие действия (ручные) =====

  async showUnit(id: string, data: ShowOnDemoInput): Promise<DemoDisplay> {
    const normalizedId = this.normalizeRequiredText(id, 'id');
    await this.findOne(normalizedId);

    const projectId = await this.ensureProjectExists(
      this.normalizeRequiredText(data.projectId, 'projectId'),
    );

    let unitId: string | null = null;
    const requestedUnitId = this.normalizeNullableId(data.unitId);

    if (requestedUnitId) {
      const unit = await this.ensureUnitExists(requestedUnitId);

      if (unit.projectId !== projectId) {
        throw new NotFoundException('Юнит не принадлежит указанному проекту');
      }

      unitId = unit.id;
    }

    return this.prisma.demoDisplay.update({
      where: { id: normalizedId },
      data: {
        demoEnabled: true,
        lastViewerActivityAt: new Date(),
        autoplayEnabled: false,
        currentProjectId: projectId,
        currentUnitId: unitId,
      },
    });
  }

  async setAutoplay(
    id: string,
    data: SetAutoplayInput,
  ): Promise<DemoDisplay> {
    const normalizedId = this.normalizeRequiredText(id, 'id');
    await this.findOne(normalizedId);

    const autoplayProjectId = this.normalizeNullableId(data.autoplayProjectId);

    if (autoplayProjectId) {
      await this.ensureProjectExists(autoplayProjectId);
    }

    const autoplayDelaySec = this.normalizeAutoplayDelay(data.autoplayDelaySec);

    const updateData: Prisma.DemoDisplayUncheckedUpdateInput = {
      demoEnabled: true,
      autoplayEnabled: data.enabled,
      lastViewerActivityAt: new Date(),
    };

    if (data.autoplayProjectId !== undefined) {
      updateData.autoplayProjectId = autoplayProjectId;
    }

    if (autoplayDelaySec !== undefined) {
      updateData.autoplayDelaySec = autoplayDelaySec;
    }

    if (data.enabled) {
      updateData.currentProjectId = null;
      updateData.currentUnitId = null;
    }

    return this.prisma.demoDisplay.update({
      where: { id: normalizedId },
      data: updateData,
    });
  }

  // ===== Публичные вещи для телевизора =====

  async findPublicByCode(code: string): Promise<DemoDisplay> {
    const normalizedCode = this.normalizeRequiredText(code, 'code');

    const display = await this.prisma.demoDisplay.findUnique({
      where: { code: normalizedCode },
    });

    const isPubliclyVisible = !!display && display.isActive;

    if (!isPubliclyVisible) {
      throw new NotFoundException('Демо-дисплей не найден или отключён');
    }

    return this.toPublicDisplay(display as DemoDisplay);
  }

  async findAllPublicActive(): Promise<DemoDisplay[]> {
    const displays = await this.prisma.demoDisplay.findMany({
      where: {
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return displays.map((display) => this.toPublicDisplay(display));
  }

  async pingByCode(code: string): Promise<void> {
    const normalizedCode = this.normalizeRequiredText(code, 'code');
    const now = new Date();

    await this.prisma.demoDisplay.updateMany({
      where: {
        code: normalizedCode,
        isActive: true,
      },
      data: {
        lastPingAt: now,
      },
    });
  }
}