const API_URL = (() => {
  const raw = String(
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  ).trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

const STORAGE_TOKEN_KEY = 'nhb_token';

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;

  // runtime 3D-часть
  threeDModelUrl?: string | null;
  threeDModelFormat?: string | null;
  threeDPreviewImage?: string | null;

  // publish layer
  published3DAssetId?: string | null;
  publishedScenePresetId?: string | null;
  publishedCameraPresetId?: string | null;
}

export type PublicProject = Project;

export interface StudioProject extends Project {
  _count?: {
    buildings?: number;
    units?: number;
    threeDAssets?: number;
    scenePresets?: number;
    cameraPresets?: number;
    threeDBindings?: number;
    importJobs?: number;
  };
}

export interface StudioProjectDetails extends StudioProject {
  buildings?: Array<{
    id: string;
    label: string;
    numberOfFloors?: number | null;
  }>;
  threeDAssets?: Array<{
    id: string;
    name: string;
    versionLabel?: string | null;
    sourceFormat?: string | null;
    outputFormat?: string | null;
    status: string;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
    sourceFile?: {
      id: string;
      kind: string;
      originalName: string;
      publicUrl?: string | null;
      storagePath: string;
      extension?: string | null;
    } | null;
    outputFile?: {
      id: string;
      kind: string;
      originalName: string;
      publicUrl?: string | null;
      storagePath: string;
      extension?: string | null;
    } | null;
    previewFile?: {
      id: string;
      kind: string;
      originalName: string;
      publicUrl?: string | null;
      storagePath: string;
      extension?: string | null;
    } | null;
  }>;
  scenePresets?: Array<{
    id: string;
    name: string;
    isDefault: boolean;
    isPublished: boolean;
    backgroundColor?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  cameraPresets?: Array<{
    id: string;
    name: string;
    isDefault: boolean;
    scenePresetId?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  threeDBindings?: Array<{
    id: string;
    targetType: string;
    buildingId?: string | null;
    sectionId?: string | null;
    floorId?: string | null;
    unitId?: string | null;
    nodeKey: string;
    nodeName?: string | null;
    nodePath?: string | null;
    groupName?: string | null;
    materialName?: string | null;
    isPrimary: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  importJobs?: Array<{
    id: string;
    type: string;
    status: string;
    errorText?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface UpdateProject3DPayload {
  threeDModelUrl?: string | null;
  threeDModelFormat?: string | null;
  threeDPreviewImage?: string | null;

  published3DAssetId?: string | null;
  publishedScenePresetId?: string | null;
  publishedCameraPresetId?: string | null;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

function normalizeNullableText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeUpdateProject3DPayload(
  payload: UpdateProject3DPayload,
): UpdateProject3DPayload {
  return {
    ...(payload.threeDModelUrl !== undefined && {
      threeDModelUrl: normalizeNullableText(payload.threeDModelUrl) ?? null,
    }),
    ...(payload.threeDModelFormat !== undefined && {
      threeDModelFormat:
        normalizeNullableText(payload.threeDModelFormat) ?? null,
    }),
    ...(payload.threeDPreviewImage !== undefined && {
      threeDPreviewImage:
        normalizeNullableText(payload.threeDPreviewImage) ?? null,
    }),
    ...(payload.published3DAssetId !== undefined && {
      published3DAssetId:
        normalizeNullableText(payload.published3DAssetId) ?? null,
    }),
    ...(payload.publishedScenePresetId !== undefined && {
      publishedScenePresetId:
        normalizeNullableText(payload.publishedScenePresetId) ?? null,
    }),
    ...(payload.publishedCameraPresetId !== undefined && {
      publishedCameraPresetId:
        normalizeNullableText(payload.publishedCameraPresetId) ?? null,
    }),
  };
}

async function parseResponse<T>(res: Response): Promise<T> {
  const rawText = await res.text();

  let parsed: unknown = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;

    if (parsed && typeof parsed === 'object') {
      const data = parsed as { message?: string | string[]; error?: string };

      if (typeof data.message === 'string') {
        message = data.message;
      } else if (Array.isArray(data.message)) {
        message = data.message.join(', ');
      } else if (typeof data.error === 'string' && data.error.trim()) {
        message = data.error;
      }
    } else if (typeof parsed === 'string' && parsed.trim()) {
      message = parsed;
    }

    throw new Error(message);
  }

  if (res.status === 204 || !rawText) {
    return null as T;
  }

  return parsed as T;
}

async function privateRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
    credentials: 'include',
    ...options,
  });

  return parseResponse<T>(res);
}

async function privateFormRequest<T>(
  path: string,
  formData: FormData,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
    credentials: 'include',
    method: 'POST',
    body: formData,
    ...options,
  });

  return parseResponse<T>(res);
}

async function publicRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  return parseResponse<T>(res);
}

// --------------------
// Runtime projects
// --------------------

export async function fetchProjects(): Promise<Project[]> {
  return privateRequest<Project[]>('/projects');
}

export async function fetchProject(projectId: string): Promise<Project> {
  return privateRequest<Project>(`/projects/${encodeURIComponent(projectId)}`);
}

export async function updateProject3D(
  projectId: string,
  payload: UpdateProject3DPayload,
): Promise<Project> {
  return privateRequest<Project>(`/projects/${encodeURIComponent(projectId)}/3d`, {
    method: 'PATCH',
    body: JSON.stringify(normalizeUpdateProject3DPayload(payload)),
  });
}

export async function uploadProject3DModel(
  projectId: string,
  file: File,
): Promise<Project> {
  const formData = new FormData();
  formData.append('file', file);

  return privateFormRequest<Project>(
    `/projects/${encodeURIComponent(projectId)}/3d-model/upload`,
    formData,
  );
}

// --------------------
// Public projects for TV / Demo
// --------------------

export async function fetchPublicProjects(): Promise<PublicProject[]> {
  return publicRequest<PublicProject[]>('/public/projects');
}

export async function fetchPublicProject(
  projectId: string,
): Promise<PublicProject> {
  return publicRequest<PublicProject>(
    `/public/projects/${encodeURIComponent(projectId)}`,
  );
}

// --------------------
// Hidden owner-only studio endpoints
// --------------------

export async function fetchStudioProjects(): Promise<StudioProject[]> {
  return privateRequest<StudioProject[]>('/projects/studio');
}

export async function fetchStudioProject(
  projectId: string,
): Promise<StudioProjectDetails> {
  return privateRequest<StudioProjectDetails>(
    `/projects/studio/${encodeURIComponent(projectId)}`,
  );
}

/**
 * Publish step:
 * подтягивает output/preview из published3DAsset
 * и переносит их в runtime-поля проекта для обычного Viewer.
 */
export async function publishResolvedProject3D(
  projectId: string,
): Promise<Project> {
  return privateRequest<Project>(
    `/projects/${encodeURIComponent(projectId)}/3d/publish-resolved`,
    {
      method: 'POST',
    },
  );
}