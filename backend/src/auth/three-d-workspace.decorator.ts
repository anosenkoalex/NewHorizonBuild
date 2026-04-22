import { SetMetadata } from '@nestjs/common';

export type ThreeDWorkspacePermission =
  | 'accessWorkspace'
  | 'uploadModels'
  | 'manageScenes'
  | 'configureWalkthroughs'
  | 'manageBindings'
  | 'publish'
  | 'manageAccess';

export const THREE_D_WORKSPACE_PERMISSIONS_KEY =
  'three_d_workspace_permissions';

export const RequireThreeDWorkspaceAccess = (
  ...permissions: ThreeDWorkspacePermission[]
) => SetMetadata(THREE_D_WORKSPACE_PERMISSIONS_KEY, permissions);