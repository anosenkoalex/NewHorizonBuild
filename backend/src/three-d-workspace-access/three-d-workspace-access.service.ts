import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ThreeDWorkspacePermission } from '../auth/three-d-workspace.decorator';

export interface CreateThreeDWorkspaceAccessInput {
  email: string;
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

export interface UpdateThreeDWorkspaceAccessInput {
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

type AccessRecord = Awaited<
  ReturnType<ThreeDWorkspaceAccessService['findByEmail']>
>;

@Injectable()
export class ThreeDWorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(email: string): string {
    const normalized = String(email ?? '').trim().toLowerCase();

    if (!normalized) {
      throw new BadRequestException('email обязателен');
    }

    return normalized;
  }

  async findByEmail(email: string) {
    return this.prisma.threeDWorkspaceAccess.findUnique({
      where: {
        email: this.normalizeEmail(email),
      },
    });
  }

  async findById(id: string) {
    const item = await this.prisma.threeDWorkspaceAccess.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('3D workspace access не найден');
    }

    return item;
  }

  async listAll() {
    return this.prisma.threeDWorkspaceAccess.findMany({
      orderBy: [{ isActive: 'desc' }, { email: 'asc' }],
    });
  }

  async create(input: CreateThreeDWorkspaceAccessInput) {
    const email = this.normalizeEmail(input.email);

    const existing = await this.prisma.threeDWorkspaceAccess.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('Такой email уже есть в 3D workspace access');
    }

    return this.prisma.threeDWorkspaceAccess.create({
      data: {
        email,
        fullName: input.fullName?.trim() || null,
        isActive: input.isActive ?? true,
        canAccessWorkspace: input.canAccessWorkspace ?? true,
        canUploadModels: input.canUploadModels ?? false,
        canManageScenes: input.canManageScenes ?? false,
        canConfigureWalkthroughs: input.canConfigureWalkthroughs ?? false,
        canManageBindings: input.canManageBindings ?? false,
        canPublish: input.canPublish ?? false,
        canManageAccess: input.canManageAccess ?? false,
        notes: input.notes?.trim() || null,
      },
    });
  }

  async update(id: string, input: UpdateThreeDWorkspaceAccessInput) {
    await this.findById(id);

    const data: Record<string, unknown> = {};

    if (input.email !== undefined) {
      data.email = this.normalizeEmail(input.email);
    }

    if (input.fullName !== undefined) {
      data.fullName = input.fullName?.trim() || null;
    }

    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
    }

    if (input.canAccessWorkspace !== undefined) {
      data.canAccessWorkspace = input.canAccessWorkspace;
    }

    if (input.canUploadModels !== undefined) {
      data.canUploadModels = input.canUploadModels;
    }

    if (input.canManageScenes !== undefined) {
      data.canManageScenes = input.canManageScenes;
    }

    if (input.canConfigureWalkthroughs !== undefined) {
      data.canConfigureWalkthroughs = input.canConfigureWalkthroughs;
    }

    if (input.canManageBindings !== undefined) {
      data.canManageBindings = input.canManageBindings;
    }

    if (input.canPublish !== undefined) {
      data.canPublish = input.canPublish;
    }

    if (input.canManageAccess !== undefined) {
      data.canManageAccess = input.canManageAccess;
    }

    if (input.notes !== undefined) {
      data.notes = input.notes?.trim() || null;
    }

    return this.prisma.threeDWorkspaceAccess.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);

    await this.prisma.threeDWorkspaceAccess.delete({
      where: { id },
    });
  }

  hasPermission(
    access: AccessRecord | null,
    permission: ThreeDWorkspacePermission,
  ): boolean {
    if (!access) return false;
    if (!access.isActive) return false;
    if (!access.canAccessWorkspace) return false;

    switch (permission) {
      case 'accessWorkspace':
        return true;
      case 'uploadModels':
        return access.canUploadModels;
      case 'manageScenes':
        return access.canManageScenes;
      case 'configureWalkthroughs':
        return access.canConfigureWalkthroughs;
      case 'manageBindings':
        return access.canManageBindings;
      case 'publish':
        return access.canPublish;
      case 'manageAccess':
        return access.canManageAccess;
      default:
        return false;
    }
  }

  getPermissionMap(access: AccessRecord | null) {
    return {
      hasAccess: this.hasPermission(access, 'accessWorkspace'),
      canUploadModels: this.hasPermission(access, 'uploadModels'),
      canManageScenes: this.hasPermission(access, 'manageScenes'),
      canConfigureWalkthroughs: this.hasPermission(
        access,
        'configureWalkthroughs',
      ),
      canManageBindings: this.hasPermission(access, 'manageBindings'),
      canPublish: this.hasPermission(access, 'publish'),
      canManageAccess: this.hasPermission(access, 'manageAccess'),
    };
  }
}