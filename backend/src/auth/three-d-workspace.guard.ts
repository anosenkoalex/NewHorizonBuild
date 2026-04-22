import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  THREE_D_WORKSPACE_PERMISSIONS_KEY,
  ThreeDWorkspacePermission,
} from './three-d-workspace.decorator';
import { ThreeDWorkspaceAccessService } from '../three-d-workspace-access/three-d-workspace-access.service';

type RequestUser = {
  userId?: string;
  email?: string;
  role?: string;
};

@Injectable()
export class ThreeDWorkspaceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly threeDWorkspaceAccessService: ThreeDWorkspaceAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<ThreeDWorkspacePermission[]>(
        THREE_D_WORKSPACE_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? ['accessWorkspace'];

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user?.email) {
      throw new ForbiddenException('3D workspace access denied');
    }

    const access = await this.threeDWorkspaceAccessService.findByEmail(
      user.email,
    );

    if (!access) {
      throw new ForbiddenException('3D workspace access denied');
    }

    for (const permission of requiredPermissions) {
      const ok = this.threeDWorkspaceAccessService.hasPermission(
        access,
        permission,
      );

      if (!ok) {
        throw new ForbiddenException('3D workspace access denied');
      }
    }

    request.threeDWorkspaceAccess = access;
    return true;
  }
}