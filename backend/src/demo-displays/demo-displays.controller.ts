import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DemoDisplay, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ThreeDWorkspaceGuard } from '../auth/three-d-workspace.guard';
import { RequireThreeDWorkspaceAccess } from '../auth/three-d-workspace.decorator';
import { DemoDisplaysService } from './demo-displays.service';
import {
  CreateDemoDisplayInput,
  UpdateDemoDisplayInput,
} from './demo-displays.service';

interface ShowOnDemoInput {
  projectId: string;
  unitId?: string | null;
}

interface SetAutoplayInput {
  enabled: boolean;
  autoplayProjectId?: string | null;
  autoplayDelaySec?: number | null;
  displayId?: string | null;
}

interface AssignPresenterInput {
  presenterUserId: string | null;
}

interface ToggleDemoModeInput {
  enabled: boolean;
  displayId?: string | null;
}

interface SyncViewerStateInput {
  projectId?: string | null;
  unitId?: string | null;
  liveMode: boolean;
  displayId?: string | null;
}

interface CreateMyDemoDisplayInput {
  name: string;
  office?: string | null;
}

interface UpdateMyDemoDisplayInput {
  name?: string;
  office?: string | null;
  isActive?: boolean;
  displayId?: string | null;
}

type RequestUser = {
  userId?: string;
  email?: string;
  role?: UserRole | string;
};

const EMPLOYEE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SALES_HEAD,
  UserRole.LEGAL,
  UserRole.VIEWER,
];

function isManagerialRole(role?: string): boolean {
  const normalized = String(role ?? '').trim().toUpperCase();
  return normalized === 'ADMIN' || normalized === 'SALES_HEAD';
}

function getActor(req: any): { userId: string; role: string } {
  const user = (req?.user ?? {}) as RequestUser;
  const userId = String(user.userId ?? '').trim();
  const role = String(user.role ?? '').trim().toUpperCase();

  if (!userId) {
    throw new ForbiddenException('Пользователь не определён');
  }

  return { userId, role };
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    throw new BadRequestException(`Поле ${fieldName} обязательно`);
  }

  return normalized;
}

function normalizeRequiredName(name: unknown): string {
  return normalizeRequiredText(name, 'name');
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return String(value).trim() || null;
}

function normalizeOptionalId(value: unknown): string | null {
  return normalizeOptionalText(value);
}

function validateAutoplayDelay(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (!Number.isFinite(value)) {
    throw new BadRequestException('autoplayDelaySec должен быть числом');
  }

  const numeric = Number(value);

  if (numeric < 0) {
    throw new BadRequestException('autoplayDelaySec должен быть >= 0');
  }

  return numeric;
}

function normalizeShowOnDemoPayload(body: ShowOnDemoInput): ShowOnDemoInput {
  return {
    projectId: normalizeRequiredText(body?.projectId, 'projectId'),
    unitId: normalizeOptionalId(body?.unitId),
  };
}

function normalizeUpdateDemoDisplayPayload(
  body: UpdateDemoDisplayInput,
): UpdateDemoDisplayInput {
  const payload: UpdateDemoDisplayInput = {
    ...(body.name !== undefined && { name: String(body.name ?? '').trim() }),
    ...(body.office !== undefined && {
      office: normalizeOptionalText(body.office),
    }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),

    ...(body.demoEnabled !== undefined && {
      demoEnabled: body.demoEnabled,
    }),
    ...(body.presenterUserId !== undefined && {
      presenterUserId: normalizeOptionalId(body.presenterUserId),
    }),
    ...(body.lastViewerActivityAt !== undefined && {
      lastViewerActivityAt: body.lastViewerActivityAt,
    }),

    ...(body.currentProjectId !== undefined && {
      currentProjectId: normalizeOptionalId(body.currentProjectId),
    }),
    ...(body.currentUnitId !== undefined && {
      currentUnitId: normalizeOptionalId(body.currentUnitId),
    }),
    ...(body.autoplayEnabled !== undefined && {
      autoplayEnabled: body.autoplayEnabled,
    }),
    ...(body.autoplayProjectId !== undefined && {
      autoplayProjectId: normalizeOptionalId(body.autoplayProjectId),
    }),
    ...(body.autoplayDelaySec !== undefined && {
      autoplayDelaySec: validateAutoplayDelay(body.autoplayDelaySec),
    }),
  };

  if (payload.name !== undefined && !payload.name.trim()) {
    throw new BadRequestException('Поле name не может быть пустым');
  }

  return payload;
}

@Controller()
export class DemoDisplaysController {
  constructor(private readonly demoDisplaysService: DemoDisplaysService) {}

  private async resolveMyDisplay(
    req: any,
    preferredDisplayId?: string | null,
  ): Promise<DemoDisplay> {
    const actor = getActor(req);

    const existing = await this.demoDisplaysService.findByPresenterUserId(
      actor.userId,
    );

    if (existing) {
      return existing;
    }

    const normalizedPreferredId = normalizeOptionalId(preferredDisplayId);
    if (!normalizedPreferredId) {
      throw new ForbiddenException('Для сотрудника demo-экран не найден');
    }

    const display = await this.demoDisplaysService.findOne(normalizedPreferredId);

    const displayOwnedByOtherUser =
      !!display.presenterUserId &&
      display.presenterUserId !== actor.userId &&
      !isManagerialRole(actor.role);

    if (displayOwnedByOtherUser) {
      throw new ForbiddenException('Экран уже привязан к другому сотруднику');
    }

    if (!display.presenterUserId) {
      await this.demoDisplaysService.assignPresenter(display.id, {
        presenterUserId: actor.userId,
      });
      return this.demoDisplaysService.findOne(display.id);
    }

    return display;
  }

  // ===== Hidden 3D workspace endpoints =====

  @Get('demo-displays')
  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('accessWorkspace')
  async findAll(): Promise<DemoDisplay[]> {
    return this.demoDisplaysService.findAll();
  }

  @Post('demo-displays')
  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  async create(@Body() body: CreateDemoDisplayInput): Promise<DemoDisplay> {
    const name = normalizeRequiredName(body?.name);
    const office = normalizeOptionalText(body?.office);

    return this.demoDisplaysService.create({
      name,
      office,
    });
  }

  @Patch('demo-displays/:id')
  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateDemoDisplayInput,
  ): Promise<DemoDisplay> {
    return this.demoDisplaysService.update(
      normalizeRequiredText(id, 'id'),
      normalizeUpdateDemoDisplayPayload(body),
    );
  }

  @Delete('demo-displays/:id')
  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  async remove(@Param('id') id: string): Promise<void> {
    return this.demoDisplaysService.remove(normalizeRequiredText(id, 'id'));
  }

  // ===== Мой demo-экран (clean API) =====

  @Get('demo-displays/me')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async getMyDisplay(@Req() req: any): Promise<DemoDisplay | null> {
    const actor = getActor(req);
    return this.demoDisplaysService.findByPresenterUserId(actor.userId);
  }

  @Post('demo-displays/me')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async createMyDisplay(
    @Body() body: CreateMyDemoDisplayInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    const actor = getActor(req);

    const name = normalizeRequiredName(body?.name);
    const office = normalizeOptionalText(body?.office);

    return this.demoDisplaysService.upsertPresenterDisplay(actor.userId, {
      name,
      office,
    });
  }

  @Patch('demo-displays/me')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async updateMyDisplay(
    @Body() body: UpdateMyDemoDisplayInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    const display = await this.resolveMyDisplay(req, body?.displayId);

    const payload: UpdateDemoDisplayInput = {
      ...(body.name !== undefined && { name: String(body.name ?? '').trim() }),
      ...(body.office !== undefined && {
        office: normalizeOptionalText(body.office),
      }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    };

    if (payload.name !== undefined && !payload.name.trim()) {
      throw new BadRequestException('Поле name не может быть пустым');
    }

    return this.demoDisplaysService.update(display.id, payload);
  }

  @Post('demo-displays/me/set-demo-enabled')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async setMyDemoEnabled(
    @Body() body: ToggleDemoModeInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    if (typeof body?.enabled !== 'boolean') {
      throw new BadRequestException('enabled должен быть boolean');
    }

    const display = await this.resolveMyDisplay(req, body?.displayId);

    return this.demoDisplaysService.setDemoEnabled(display.id, {
      enabled: body.enabled,
    });
  }

  @Post('demo-displays/me/sync-viewer-state')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async syncMyViewerState(
    @Body() body: SyncViewerStateInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    if (typeof body?.liveMode !== 'boolean') {
      throw new BadRequestException('liveMode должен быть boolean');
    }

    const actor = getActor(req);
    const display = await this.resolveMyDisplay(req, body?.displayId);

    return this.demoDisplaysService.syncViewerState(display.id, {
      presenterUserId: actor.userId,
      projectId: normalizeOptionalId(body.projectId),
      unitId: normalizeOptionalId(body.unitId),
      liveMode: body.liveMode,
    });
  }

  @Post('demo-displays/me/touch-viewer')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async touchMyViewer(
    @Body() body: { displayId?: string | null } = {},
    @Req() req: any,
  ): Promise<DemoDisplay> {
    const display = await this.resolveMyDisplay(req, body?.displayId);
    return this.demoDisplaysService.touchViewerActivity(display.id);
  }

  @Post('demo-displays/me/clear-viewer')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async clearMyViewer(
    @Body() body: { displayId?: string | null } = {},
    @Req() req: any,
  ): Promise<DemoDisplay> {
    const actor = getActor(req);
    const display = await this.resolveMyDisplay(req, body?.displayId);

    return this.demoDisplaysService.syncViewerState(display.id, {
      presenterUserId: actor.userId,
      projectId: null,
      unitId: null,
      liveMode: false,
    });
  }

  @Post('demo-displays/me/set-autoplay')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async setMyAutoplay(
    @Body() body: SetAutoplayInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    if (typeof body?.enabled !== 'boolean') {
      throw new BadRequestException('enabled должен быть boolean');
    }

    const display = await this.resolveMyDisplay(req, body?.displayId);

    return this.demoDisplaysService.setAutoplay(display.id, {
      enabled: body.enabled,
      autoplayProjectId: normalizeOptionalId(body.autoplayProjectId) ?? undefined,
      autoplayDelaySec: validateAutoplayDelay(body.autoplayDelaySec) ?? undefined,
    });
  }

  // ===== Переходные алиасы /my/*, чтобы не ломать текущий фронт =====

  @Get('demo-displays/my')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async getMyDisplayLegacy(@Req() req: any): Promise<DemoDisplay | null> {
    return this.getMyDisplay(req);
  }

  @Post('demo-displays/my/upsert')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async upsertMyDisplayLegacy(
    @Body() body: CreateMyDemoDisplayInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    const actor = getActor(req);

    const name = normalizeRequiredName(body?.name);
    const office = normalizeOptionalText(body?.office);

    return this.demoDisplaysService.upsertPresenterDisplay(actor.userId, {
      name,
      office,
    });
  }

  @Post('demo-displays/my/set-demo-enabled')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async setMyDemoEnabledLegacy(
    @Body() body: ToggleDemoModeInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    return this.setMyDemoEnabled(body, req);
  }

  @Post('demo-displays/my/sync-viewer-state')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async syncMyViewerStateLegacy(
    @Body() body: SyncViewerStateInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    return this.syncMyViewerState(body, req);
  }

  @Post('demo-displays/my/touch-viewer')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async touchMyViewerLegacy(
    @Body() body: { displayId?: string | null } = {},
    @Req() req: any,
  ): Promise<DemoDisplay> {
    return this.touchMyViewer(body, req);
  }

  @Post('demo-displays/my/clear-viewer')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async clearMyViewerLegacy(
    @Body() body: { displayId?: string | null } = {},
    @Req() req: any,
  ): Promise<DemoDisplay> {
    return this.clearMyViewer(body, req);
  }

  @Post('demo-displays/my/set-autoplay')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async setMyAutoplayLegacy(
    @Body() body: SetAutoplayInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    return this.setMyAutoplay(body, req);
  }

  // ===== Hidden 3D workspace helpers =====

  @Post('demo-displays/:id/assign-presenter')
  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  async assignPresenter(
    @Param('id') id: string,
    @Body() body: AssignPresenterInput,
  ): Promise<DemoDisplay> {
    return this.demoDisplaysService.assignPresenter(
      normalizeRequiredText(id, 'id'),
      {
        presenterUserId: normalizeOptionalId(body?.presenterUserId),
      },
    );
  }

  // ===== Legacy id-based ручки (оставлены для совместимости) =====

  @Post('demo-displays/:id/set-demo-enabled')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async setDemoEnabled(
    @Param('id') id: string,
    @Body() body: ToggleDemoModeInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    if (typeof body?.enabled !== 'boolean') {
      throw new BadRequestException('enabled должен быть boolean');
    }

    const normalizedId = normalizeRequiredText(id, 'id');
    const actor = getActor(req);
    const display = await this.demoDisplaysService.findOne(normalizedId);

    const displayOwnedByOtherUser =
      !!display.presenterUserId &&
      display.presenterUserId !== actor.userId &&
      !isManagerialRole(actor.role);

    if (displayOwnedByOtherUser) {
      throw new ForbiddenException('Экран уже привязан к другому сотруднику');
    }

    if (body.enabled && !display.presenterUserId) {
      await this.demoDisplaysService.assignPresenter(normalizedId, {
        presenterUserId: actor.userId,
      });
    }

    return this.demoDisplaysService.setDemoEnabled(normalizedId, {
      enabled: body.enabled,
    });
  }

  @Post('demo-displays/:id/sync-viewer-state')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async syncViewerState(
    @Param('id') id: string,
    @Body() body: SyncViewerStateInput,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    if (typeof body?.liveMode !== 'boolean') {
      throw new BadRequestException('liveMode должен быть boolean');
    }

    const normalizedId = normalizeRequiredText(id, 'id');
    const actor = getActor(req);
    const display = await this.demoDisplaysService.findOne(normalizedId);

    const displayOwnedByOtherUser =
      !!display.presenterUserId &&
      display.presenterUserId !== actor.userId &&
      !isManagerialRole(actor.role);

    if (displayOwnedByOtherUser) {
      throw new ForbiddenException('Экран уже привязан к другому сотруднику');
    }

    const presenterUserId = display.presenterUserId ?? actor.userId;

    if (!display.presenterUserId) {
      await this.demoDisplaysService.assignPresenter(normalizedId, {
        presenterUserId,
      });
    }

    return this.demoDisplaysService.syncViewerState(normalizedId, {
      presenterUserId,
      projectId: normalizeOptionalId(body.projectId),
      unitId: normalizeOptionalId(body.unitId),
      liveMode: body.liveMode,
    });
  }

  @Post('demo-displays/:id/touch-viewer')
  @UseGuards(JwtAuthGuard)
  @Roles(...EMPLOYEE_ROLES)
  async touchViewer(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<DemoDisplay> {
    const normalizedId = normalizeRequiredText(id, 'id');
    const actor = getActor(req);
    const display = await this.demoDisplaysService.findOne(normalizedId);

    const displayOwnedByOtherUser =
      !!display.presenterUserId &&
      display.presenterUserId !== actor.userId &&
      !isManagerialRole(actor.role);

    if (displayOwnedByOtherUser) {
      throw new ForbiddenException('Экран уже привязан к другому сотруднику');
    }

    if (!display.presenterUserId) {
      await this.demoDisplaysService.assignPresenter(normalizedId, {
        presenterUserId: actor.userId,
      });
    }

    return this.demoDisplaysService.touchViewerActivity(normalizedId);
  }

  // ===== Ручное управление показом =====

  @Post('demo-displays/:id/show-unit')
  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  async showUnit(
    @Param('id') id: string,
    @Body() body: ShowOnDemoInput,
  ): Promise<DemoDisplay> {
    return this.demoDisplaysService.showUnit(
      normalizeRequiredText(id, 'id'),
      normalizeShowOnDemoPayload(body),
    );
  }

  @Post('demo-displays/:id/set-autoplay')
  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageScenes')
  async setAutoplay(
    @Param('id') id: string,
    @Body() body: SetAutoplayInput,
  ): Promise<DemoDisplay> {
    if (typeof body?.enabled !== 'boolean') {
      throw new BadRequestException('enabled должен быть boolean');
    }

    return this.demoDisplaysService.setAutoplay(
      normalizeRequiredText(id, 'id'),
      {
        enabled: body.enabled,
        autoplayProjectId: normalizeOptionalId(body.autoplayProjectId) ?? undefined,
        autoplayDelaySec: validateAutoplayDelay(body.autoplayDelaySec) ?? undefined,
      },
    );
  }

  // ===== Публичные эндпоинты для телевизора =====

  @Get('public/demo-displays')
  async listPublic(): Promise<DemoDisplay[]> {
    return this.demoDisplaysService.findAllPublicActive();
  }

  @Get('public/demo-displays/:code')
  async getPublicByCode(@Param('code') code: string): Promise<DemoDisplay> {
    return this.demoDisplaysService.findPublicByCode(
      normalizeRequiredText(code, 'code'),
    );
  }

  @Post('demo-displays/:code/ping')
  async ping(@Param('code') code: string): Promise<void> {
    await this.demoDisplaysService.pingByCode(
      normalizeRequiredText(code, 'code'),
    );
  }
}