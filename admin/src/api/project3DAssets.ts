const API_URL = (() => {
  const raw = String(
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  ).trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

const STORAGE_TOKEN_KEY = 'nhb_token';

export type Project3DAssetStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type ImportJobType =
  | 'MODEL_UPLOAD'
  | 'MODEL_PARSE'
  | 'MODEL_CONVERT'
  | 'MODEL_NORMALIZE'
  | 'MODEL_PREVIEW_RENDER'
  | 'UNITS_IMPORT'
  | 'PLANS_IMPORT';

export type ImportJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELED';

export interface AssetFileRef {
  id: string;
  kind: string;
  originalName: string;
  mimeType?: string | null;
  extension?: string | null;
  sizeBytes?: number | null;
  storagePath: string;
  publicUrl?: string | null;
  checksum?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project3DImportJob {
  id: string;
  type: ImportJobType;
  status: ImportJobStatus;
  payloadJson?: unknown;
  resultJson?: unknown;
  errorText?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project3DAsset {
  id: string;
  projectId: string;
  name: string;
  versionLabel?: string | null;
  sourceFormat?: string | null;
  outputFormat?: string | null;
  status: Project3DAssetStatus;
  notes?: string | null;
  normalizationJson?: unknown;
  diagnosticsJson?: unknown;
  isPublished: boolean;

  sourceFileId?: string | null;
  outputFileId?: string | null;
  previewFileId?: string | null;

  sourceFile?: AssetFileRef | null;
  outputFile?: AssetFileRef | null;
  previewFile?: AssetFileRef | null;

  importJobs?: Project3DImportJob[];

  createdAt: string;
  updatedAt: string;
}

export interface CreateProject3DAssetPayload {
  projectId: string;
  name: string;
  versionLabel?: string | null;
  sourceFormat?: string | null;
  outputFormat?: string | null;
  notes?: string | null;
}

export interface UpdateProject3DAssetPayload {
  name?: string;
  versionLabel?: string | null;
  sourceFormat?: string | null;
  outputFormat?: string | null;
  notes?: string | null;
  normalizationJson?: unknown;
  diagnosticsJson?: unknown;
}

export interface AttachProject3DAssetFilePayload {
  fileId: string;
  format?: string | null;
}

export interface AttachProject3DAssetPreviewFilePayload {
  fileId: string;
}

export interface SetProject3DAssetStatusPayload {
  status: Project3DAssetStatus;
  notes?: string | null;
}

export interface CreateProject3DImportJobPayload {
  type: ImportJobType;
  payloadJson?: unknown;
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

function normalizeRequiredText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeCreateAssetPayload(
  payload: CreateProject3DAssetPayload,
): CreateProject3DAssetPayload {
  return {
    projectId: normalizeRequiredText(payload.projectId),
    name: normalizeRequiredText(payload.name),
    versionLabel: normalizeNullableText(payload.versionLabel),
    sourceFormat: normalizeNullableText(payload.sourceFormat),
    outputFormat: normalizeNullableText(payload.outputFormat),
    notes: normalizeNullableText(payload.notes),
  };
}

function normalizeUpdateAssetPayload(
  payload: UpdateProject3DAssetPayload,
): UpdateProject3DAssetPayload {
  return {
    ...(payload.name !== undefined && {
      name: normalizeRequiredText(payload.name),
    }),
    ...(payload.versionLabel !== undefined && {
      versionLabel: normalizeNullableText(payload.versionLabel),
    }),
    ...(payload.sourceFormat !== undefined && {
      sourceFormat: normalizeNullableText(payload.sourceFormat),
    }),
    ...(payload.outputFormat !== undefined && {
      outputFormat: normalizeNullableText(payload.outputFormat),
    }),
    ...(payload.notes !== undefined && {
      notes: normalizeNullableText(payload.notes),
    }),
    ...(payload.normalizationJson !== undefined && {
      normalizationJson: payload.normalizationJson,
    }),
    ...(payload.diagnosticsJson !== undefined && {
      diagnosticsJson: payload.diagnosticsJson,
    }),
  };
}

function normalizeAttachFilePayload(
  payload: AttachProject3DAssetFilePayload,
): AttachProject3DAssetFilePayload {
  return {
    fileId: normalizeRequiredText(payload.fileId),
    format: normalizeNullableText(payload.format),
  };
}

function normalizeAttachPreviewPayload(
  payload: AttachProject3DAssetPreviewFilePayload,
): AttachProject3DAssetPreviewFilePayload {
  return {
    fileId: normalizeRequiredText(payload.fileId),
  };
}

function normalizeSetStatusPayload(
  payload: SetProject3DAssetStatusPayload,
): SetProject3DAssetStatusPayload {
  return {
    status: payload.status,
    notes: normalizeNullableText(payload.notes),
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
      const data = parsed as {
        message?: string | string[];
        error?: string;
      };

      if (typeof data.message === 'string' && data.message.trim()) {
        message = data.message;
      } else if (Array.isArray(data.message) && data.message.length > 0) {
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

export async function fetchProject3DAssetsByProject(
  projectId: string,
): Promise<Project3DAsset[]> {
  return privateRequest<Project3DAsset[]>(
    `/project-3d-assets/project/${encodeURIComponent(
      normalizeRequiredText(projectId),
    )}`,
  );
}

export async function fetchProject3DAsset(
  assetId: string,
): Promise<Project3DAsset> {
  return privateRequest<Project3DAsset>(
    `/project-3d-assets/${encodeURIComponent(
      normalizeRequiredText(assetId),
    )}`,
  );
}

export async function createProject3DAssetDraft(
  payload: CreateProject3DAssetPayload,
): Promise<Project3DAsset> {
  return privateRequest<Project3DAsset>('/project-3d-assets', {
    method: 'POST',
    body: JSON.stringify(normalizeCreateAssetPayload(payload)),
  });
}

export async function updateProject3DAsset(
  assetId: string,
  payload: UpdateProject3DAssetPayload,
): Promise<Project3DAsset> {
  return privateRequest<Project3DAsset>(
    `/project-3d-assets/${encodeURIComponent(
      normalizeRequiredText(assetId),
    )}`,
    {
      method: 'PATCH',
      body: JSON.stringify(normalizeUpdateAssetPayload(payload)),
    },
  );
}

export async function attachSourceFileToProject3DAsset(
  assetId: string,
  payload: AttachProject3DAssetFilePayload,
): Promise<Project3DAsset> {
  return privateRequest<Project3DAsset>(
    `/project-3d-assets/${encodeURIComponent(
      normalizeRequiredText(assetId),
    )}/source-file`,
    {
      method: 'POST',
      body: JSON.stringify(normalizeAttachFilePayload(payload)),
    },
  );
}

export async function attachOutputFileToProject3DAsset(
  assetId: string,
  payload: AttachProject3DAssetFilePayload,
): Promise<Project3DAsset> {
  return privateRequest<Project3DAsset>(
    `/project-3d-assets/${encodeURIComponent(
      normalizeRequiredText(assetId),
    )}/output-file`,
    {
      method: 'POST',
      body: JSON.stringify(normalizeAttachFilePayload(payload)),
    },
  );
}

export async function attachPreviewFileToProject3DAsset(
  assetId: string,
  payload: AttachProject3DAssetPreviewFilePayload,
): Promise<Project3DAsset> {
  return privateRequest<Project3DAsset>(
    `/project-3d-assets/${encodeURIComponent(
      normalizeRequiredText(assetId),
    )}/preview-file`,
    {
      method: 'POST',
      body: JSON.stringify(normalizeAttachPreviewPayload(payload)),
    },
  );
}

export async function setProject3DAssetStatus(
  assetId: string,
  payload: SetProject3DAssetStatusPayload,
): Promise<Project3DAsset> {
  return privateRequest<Project3DAsset>(
    `/project-3d-assets/${encodeURIComponent(
      normalizeRequiredText(assetId),
    )}/status`,
    {
      method: 'POST',
      body: JSON.stringify(normalizeSetStatusPayload(payload)),
    },
  );
}

export async function setProject3DAssetReady(
  assetId: string,
  notes?: string | null,
): Promise<Project3DAsset> {
  return setProject3DAssetStatus(assetId, {
    status: 'READY',
    notes,
  });
}

export async function archiveProject3DAsset(
  assetId: string,
  notes?: string | null,
): Promise<Project3DAsset> {
  return setProject3DAssetStatus(assetId, {
    status: 'ARCHIVED',
    notes,
  });
}

export async function publishProject3DAsset(
  assetId: string,
): Promise<Project3DAsset> {
  return privateRequest<Project3DAsset>(
    `/project-3d-assets/${encodeURIComponent(
      normalizeRequiredText(assetId),
    )}/publish`,
    {
      method: 'POST',
    },
  );
}

export async function fetchProject3DAssetImportJobs(
  assetId: string,
): Promise<Project3DImportJob[]> {
  return privateRequest<Project3DImportJob[]>(
    `/project-3d-assets/${encodeURIComponent(
      normalizeRequiredText(assetId),
    )}/import-jobs`,
  );
}

export async function createProject3DAssetImportJob(
  assetId: string,
  payload: CreateProject3DImportJobPayload,
): Promise<Project3DImportJob> {
  return privateRequest<Project3DImportJob>(
    `/project-3d-assets/${encodeURIComponent(
      normalizeRequiredText(assetId),
    )}/import-jobs`,
    {
      method: 'POST',
      body: JSON.stringify({
        type: payload.type,
        payloadJson: payload.payloadJson,
      }),
    },
  );
}