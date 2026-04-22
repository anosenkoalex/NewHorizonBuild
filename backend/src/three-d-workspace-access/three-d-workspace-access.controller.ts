import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  RequireThreeDWorkspaceAccess,
} from '../auth/three-d-workspace.decorator';
import { ThreeDWorkspaceGuard } from '../auth/three-d-workspace.guard';
import {
  CreateThreeDWorkspaceAccessInput,
  ThreeDWorkspaceAccessService,
  UpdateThreeDWorkspaceAccessInput,
} from './three-d-workspace-access.service';

interface CreateAccessBody {
  email?: string;
  fullName?: string | null;
  isActive?: boolean;
  canAccessWorkspace?: boolean;
  canUploadModels?: boolean;
  canManageScenes?: boolean;
  canConfigureWalkthroughs?: boolean;
  canManageBindings?: boolean;
  canPublish?: boolean;
  canManageAccess?: boolean;
  notes?: string | null;
}

interface UpdateAccessBody {
  email?: string;
  fullName?: string | null;
  isActive?: boolean;
  canAccessWorkspace?: boolean;
  canUploadModels?: boolean;
  canManageScenes?: boolean;
  canConfigureWalkthroughs?: boolean;
  canManageBindings?: boolean;
  canPublish?: boolean;
  canManageAccess?: boolean;
  notes?: string | null;
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

@Controller('three-d-workspace-access')
export class ThreeDWorkspaceAccessController {
  constructor(
    private readonly threeDWorkspaceAccessService: ThreeDWorkspaceAccessService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const email = String(req.user?.email ?? '').trim().toLowerCase();

    if (!email) {
      return {
        hasAccess: false,
        email: null,
        access: null,
        permissions: this.threeDWorkspaceAccessService.getPermissionMap(null),
      };
    }

    const access = await this.threeDWorkspaceAccessService.findByEmail(email);

    return {
      hasAccess:
        this.threeDWorkspaceAccessService.hasPermission(
          access,
          'accessWorkspace',
        ),
      email,
      access,
      permissions:
        this.threeDWorkspaceAccessService.getPermissionMap(access),
    };
  }

  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageAccess')
  @Get()
  listAll() {
    return this.threeDWorkspaceAccessService.listAll();
  }

  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageAccess')
  @Post()
  create(@Body() body: CreateAccessBody) {
    const payload: CreateThreeDWorkspaceAccessInput = {
      email: normalizeRequiredText(body?.email, 'email'),
      fullName: normalizeNullableText(body?.fullName),
      isActive: body?.isActive,
      canAccessWorkspace: body?.canAccessWorkspace,
      canUploadModels: body?.canUploadModels,
      canManageScenes: body?.canManageScenes,
      canConfigureWalkthroughs: body?.canConfigureWalkthroughs,
      canManageBindings: body?.canManageBindings,
      canPublish: body?.canPublish,
      canManageAccess: body?.canManageAccess,
      notes: normalizeNullableText(body?.notes),
    };

    return this.threeDWorkspaceAccessService.create(payload);
  }

  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageAccess')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateAccessBody) {
    const payload: UpdateThreeDWorkspaceAccessInput = {
      ...(body?.email !== undefined && {
        email: normalizeRequiredText(body.email, 'email'),
      }),
      ...(body?.fullName !== undefined && {
        fullName: normalizeNullableText(body.fullName),
      }),
      ...(body?.isActive !== undefined && {
        isActive: body.isActive,
      }),
      ...(body?.canAccessWorkspace !== undefined && {
        canAccessWorkspace: body.canAccessWorkspace,
      }),
      ...(body?.canUploadModels !== undefined && {
        canUploadModels: body.canUploadModels,
      }),
      ...(body?.canManageScenes !== undefined && {
        canManageScenes: body.canManageScenes,
      }),
      ...(body?.canConfigureWalkthroughs !== undefined && {
        canConfigureWalkthroughs: body.canConfigureWalkthroughs,
      }),
      ...(body?.canManageBindings !== undefined && {
        canManageBindings: body.canManageBindings,
      }),
      ...(body?.canPublish !== undefined && {
        canPublish: body.canPublish,
      }),
      ...(body?.canManageAccess !== undefined && {
        canManageAccess: body.canManageAccess,
      }),
      ...(body?.notes !== undefined && {
        notes: normalizeNullableText(body.notes),
      }),
    };

    return this.threeDWorkspaceAccessService.update(id, payload);
  }

  @UseGuards(JwtAuthGuard, ThreeDWorkspaceGuard)
  @RequireThreeDWorkspaceAccess('manageAccess')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.threeDWorkspaceAccessService.remove(id);
  }
}