const API_URL = (() => {
  const raw = String(
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  ).trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

const STORAGE_TOKEN_KEY = 'nhb_token';

export type Project3DBindingTargetType =
  | 'PROJECT'
  | 'BUILDING'
  | 'SECTION'
  | 'FLOOR'
  | 'UNIT';

export interface Project3DBinding {
  id: string;
  projectId: string;
  targetType: Project3DBindingTargetType;

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
  metaJson?: unknown;

  createdAt: string;
  updatedAt: string;

  building?: {
    id: string;
    label: string;
    projectId: string;
  } | null;

  section?: {
    id: string;
    name: string;
    buildingId: string;
  } | null;

  floor?: {
    id: string;
    number: number;
    buildingId: string;
    sectionId?: string | null;
  } | null;

  unit?: {
    id: string;
    number?: string | null;
    projectId: string;
    buildingId: string;
    sectionId?: string | null;
    floorId?: string | null;
    modelElementKey?: string | null;
  } | null;
}

export interface CreateProject3DBindingPayload {
  projectId: string;
  targetType: Project3DBindingTargetType;

  buildingId?: string | null;
  sectionId?: string | null;
  floorId?: string | null;
  unitId?: string | null;

  nodeKey: string;
  nodeName?: string | null;
  nodePath?: string | null;
  groupName?: string | null;
  materialName?: string | null;

  isPrimary?: boolean;
  metaJson?: unknown;
}

export interface UpdateProject3DBindingPayload {
  targetType?: Project3DBindingTargetType;

  buildingId?: string | null;
  sectionId?: string | null;
  floorId?: string | null;
  unitId?: string | null;

  nodeKey?: string;
  nodeName?: string | null;
  nodePath?: string | null;
  groupName?: string | null;
  materialName?: string | null;

  isPrimary?: boolean;
  metaJson?: unknown;
}

export interface UpsertUnitPrimaryBindingPayload {
  projectId: string;
  unitId: string;
  nodeKey: string;
  nodeName?: string | null;
  nodePath?: string | null;
  groupName?: string | null;
  materialName?: string | null;
  metaJson?: unknown;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

function normalizeRequiredText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeNullableText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeCreateBindingPayload(
  payload: CreateProject3DBindingPayload,
): CreateProject3DBindingPayload {
  return {
    projectId: normalizeRequiredText(payload.projectId),
    targetType: payload.targetType,

    buildingId: normalizeNullableText(payload.buildingId),
    sectionId: normalizeNullableText(payload.sectionId),
    floorId: normalizeNullableText(payload.floorId),
    unitId: normalizeNullableText(payload.unitId),

    nodeKey: normalizeRequiredText(payload.nodeKey),
    nodeName: normalizeNullableText(payload.nodeName),
    nodePath: normalizeNullableText(payload.nodePath),
    groupName: normalizeNullableText(payload.groupName),
    materialName: normalizeNullableText(payload.materialName),

    isPrimary: payload.isPrimary,
    metaJson: payload.metaJson,
  };
}

function normalizeUpdateBindingPayload(
  payload: UpdateProject3DBindingPayload,
): UpdateProject3DBindingPayload {
  return {
    ...(payload.targetType !== undefined && {
      targetType: payload.targetType,
    }),

    ...(payload.buildingId !== undefined && {
      buildingId: normalizeNullableText(payload.buildingId),
    }),
    ...(payload.sectionId !== undefined && {
      sectionId: normalizeNullableText(payload.sectionId),
    }),
    ...(payload.floorId !== undefined && {
      floorId: normalizeNullableText(payload.floorId),
    }),
    ...(payload.unitId !== undefined && {
      unitId: normalizeNullableText(payload.unitId),
    }),

    ...(payload.nodeKey !== undefined && {
      nodeKey: normalizeRequiredText(payload.nodeKey),
    }),
    ...(payload.nodeName !== undefined && {
      nodeName: normalizeNullableText(payload.nodeName),
    }),
    ...(payload.nodePath !== undefined && {
      nodePath: normalizeNullableText(payload.nodePath),
    }),
    ...(payload.groupName !== undefined && {
      groupName: normalizeNullableText(payload.groupName),
    }),
    ...(payload.materialName !== undefined && {
      materialName: normalizeNullableText(payload.materialName),
    }),

    ...(payload.isPrimary !== undefined && {
      isPrimary: payload.isPrimary,
    }),
    ...(payload.metaJson !== undefined && {
      metaJson: payload.metaJson,
    }),
  };
}

function normalizeUpsertUnitPrimaryPayload(
  payload: UpsertUnitPrimaryBindingPayload,
): UpsertUnitPrimaryBindingPayload {
  return {
    projectId: normalizeRequiredText(payload.projectId),
    unitId: normalizeRequiredText(payload.unitId),
    nodeKey: normalizeRequiredText(payload.nodeKey),
    nodeName: normalizeNullableText(payload.nodeName),
    nodePath: normalizeNullableText(payload.nodePath),
    groupName: normalizeNullableText(payload.groupName),
    materialName: normalizeNullableText(payload.materialName),
    metaJson: payload.metaJson,
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
      const errorData = parsed as {
        message?: string | string[];
        error?: string;
      };

      if (
        typeof errorData.message === 'string' &&
        errorData.message.trim()
      ) {
        message = errorData.message;
      } else if (
        Array.isArray(errorData.message) &&
        errorData.message.length > 0
      ) {
        message = errorData.message.join(', ');
      } else if (
        typeof errorData.error === 'string' &&
        errorData.error.trim()
      ) {
        message = errorData.error;
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

async function request<T>(
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

export async function fetchProject3DBindingsByProject(
  projectId: string,
): Promise<Project3DBinding[]> {
  return request<Project3DBinding[]>(
    `/project-3d-bindings/project/${encodeURIComponent(
      normalizeRequiredText(projectId),
    )}`,
  );
}

export async function fetchProject3DBinding(
  bindingId: string,
): Promise<Project3DBinding> {
  return request<Project3DBinding>(
    `/project-3d-bindings/${encodeURIComponent(
      normalizeRequiredText(bindingId),
    )}`,
  );
}

export async function createProject3DBinding(
  payload: CreateProject3DBindingPayload,
): Promise<Project3DBinding> {
  return request<Project3DBinding>('/project-3d-bindings', {
    method: 'POST',
    body: JSON.stringify(normalizeCreateBindingPayload(payload)),
  });
}

export async function updateProject3DBinding(
  bindingId: string,
  payload: UpdateProject3DBindingPayload,
): Promise<Project3DBinding> {
  return request<Project3DBinding>(
    `/project-3d-bindings/${encodeURIComponent(
      normalizeRequiredText(bindingId),
    )}`,
    {
      method: 'PATCH',
      body: JSON.stringify(normalizeUpdateBindingPayload(payload)),
    },
  );
}

export async function deleteProject3DBinding(
  bindingId: string,
): Promise<void> {
  await request<void>(
    `/project-3d-bindings/${encodeURIComponent(
      normalizeRequiredText(bindingId),
    )}`,
    {
      method: 'DELETE',
    },
  );
}

export async function upsertUnitPrimaryProject3DBinding(
  payload: UpsertUnitPrimaryBindingPayload,
): Promise<Project3DBinding> {
  return request<Project3DBinding>('/project-3d-bindings/unit-primary', {
    method: 'POST',
    body: JSON.stringify(normalizeUpsertUnitPrimaryPayload(payload)),
  });
}