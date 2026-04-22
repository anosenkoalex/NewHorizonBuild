// admin/src/api/demoDisplays.ts

export interface DemoDisplay {
  id: string;
  name: string;
  office: string | null;
  code: string;
  isActive: boolean;

  demoEnabled: boolean;
  presenterUserId: string | null;
  lastViewerActivityAt: string | null;

  currentProjectId: string | null;
  currentUnitId: string | null;
  lastPingAt: string | null;

  autoplayEnabled: boolean;
  autoplayProjectId: string | null;
  autoplayDelaySec: number | null;
}

export type DemoDisplayPublic = DemoDisplay;

export interface CreateDemoDisplayPayload {
  name: string;
  office?: string | null;
}

export interface UpdateDemoDisplayPayload {
  name?: string;
  office?: string | null;
  isActive?: boolean;

  demoEnabled?: boolean;
  presenterUserId?: string | null;
  lastViewerActivityAt?: string | null;

  currentProjectId?: string | null;
  currentUnitId?: string | null;

  autoplayEnabled?: boolean;
  autoplayProjectId?: string | null;
  autoplayDelaySec?: number | null;
}

export interface CreateMyDemoDisplayPayload {
  name: string;
  office?: string | null;
}

export interface UpdateMyDemoDisplayPayload {
  name?: string;
  office?: string | null;
  isActive?: boolean;
  displayId?: string | null;
}

export interface ShowUnitOnDemoPayload {
  projectId: string;
  unitId?: string | null;
}

export interface SetAutoplayOnDemoPayload {
  enabled: boolean;
  autoplayProjectId?: string | null;
  autoplayDelaySec?: number | null;
  displayId?: string | null;
}

export interface AssignPresenterPayload {
  presenterUserId: string | null;
}

export interface SetDemoEnabledPayload {
  enabled: boolean;
  displayId?: string | null;
}

export interface SyncViewerStatePayload {
  projectId?: string | null;
  unitId?: string | null;
  liveMode: boolean;
  displayId?: string | null;
}

export interface UpsertMyDemoDisplayPayload {
  name: string;
  office?: string | null;
}

const API_BASE = (() => {
  const raw = String((import.meta as any).env?.VITE_API_URL ?? '/api').trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

const STORAGE_TOKEN_KEY = 'nhb_token';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function trimString(value: unknown): string {
  return String(value ?? '').trim();
}

function toNullableString(value: unknown): string | null {
  const normalized = trimString(value);
  return normalized || null;
}

function normalizeIdLike(value: unknown): string | null {
  const normalized = trimString(value);
  return normalized || null;
}

function normalizeDelaySec(value?: number | null): number | undefined {
  if (value == null) return undefined;
  if (!Number.isFinite(value)) return undefined;

  const rounded = Math.round(value);
  if (rounded <= 0) return undefined;

  return rounded;
}

function normalizeCreatePayload(
  payload: CreateDemoDisplayPayload,
): CreateDemoDisplayPayload {
  return {
    name: trimString(payload.name),
    office:
      payload.office === undefined ? undefined : toNullableString(payload.office),
  };
}

function normalizeUpdatePayload(
  payload: UpdateDemoDisplayPayload,
): UpdateDemoDisplayPayload {
  return {
    ...(payload.name !== undefined && {
      name: trimString(payload.name),
    }),
    ...(payload.office !== undefined && {
      office: toNullableString(payload.office),
    }),
    ...(payload.isActive !== undefined && {
      isActive: payload.isActive,
    }),

    ...(payload.demoEnabled !== undefined && {
      demoEnabled: payload.demoEnabled,
    }),
    ...(payload.presenterUserId !== undefined && {
      presenterUserId: normalizeIdLike(payload.presenterUserId),
    }),
    ...(payload.lastViewerActivityAt !== undefined && {
      lastViewerActivityAt: payload.lastViewerActivityAt,
    }),

    ...(payload.currentProjectId !== undefined && {
      currentProjectId: normalizeIdLike(payload.currentProjectId),
    }),
    ...(payload.currentUnitId !== undefined && {
      currentUnitId: normalizeIdLike(payload.currentUnitId),
    }),

    ...(payload.autoplayEnabled !== undefined && {
      autoplayEnabled: payload.autoplayEnabled,
    }),
    ...(payload.autoplayProjectId !== undefined && {
      autoplayProjectId: normalizeIdLike(payload.autoplayProjectId),
    }),
    ...(payload.autoplayDelaySec !== undefined && {
      autoplayDelaySec: payload.autoplayDelaySec,
    }),
  };
}

function normalizeMyCreatePayload(
  payload: CreateMyDemoDisplayPayload,
): CreateMyDemoDisplayPayload {
  return {
    name: trimString(payload.name),
    office:
      payload.office === undefined ? undefined : toNullableString(payload.office),
  };
}

function normalizeMyUpdatePayload(
  payload: UpdateMyDemoDisplayPayload,
): UpdateMyDemoDisplayPayload {
  return {
    ...(payload.name !== undefined && {
      name: trimString(payload.name),
    }),
    ...(payload.office !== undefined && {
      office: toNullableString(payload.office),
    }),
    ...(payload.isActive !== undefined && {
      isActive: payload.isActive,
    }),
    ...(payload.displayId !== undefined && {
      displayId: normalizeIdLike(payload.displayId),
    }),
  };
}

function normalizeMyDisplayPayload(
  payload: UpsertMyDemoDisplayPayload,
): UpsertMyDemoDisplayPayload {
  return {
    name: trimString(payload.name),
    office:
      payload.office === undefined ? undefined : toNullableString(payload.office),
  };
}

function normalizeShowUnitPayload(
  payload: ShowUnitOnDemoPayload,
): ShowUnitOnDemoPayload {
  return {
    projectId: trimString(payload.projectId),
    unitId: normalizeIdLike(payload.unitId),
  };
}

function normalizeSetAutoplayPayload(
  payload: SetAutoplayOnDemoPayload,
): {
  enabled: boolean;
  autoplayProjectId: string | null;
  autoplayDelaySec?: number;
  displayId?: string | null;
} {
  return {
    enabled: payload.enabled,
    autoplayProjectId: normalizeIdLike(payload.autoplayProjectId),
    autoplayDelaySec: normalizeDelaySec(payload.autoplayDelaySec),
    ...(payload.displayId !== undefined && {
      displayId: normalizeIdLike(payload.displayId),
    }),
  };
}

function normalizeSyncViewerStatePayload(
  payload: SyncViewerStatePayload,
): {
  projectId: string | null;
  unitId: string | null;
  liveMode: boolean;
  displayId?: string | null;
} {
  return {
    projectId: normalizeIdLike(payload.projectId),
    unitId: normalizeIdLike(payload.unitId),
    liveMode: payload.liveMode,
    ...(payload.displayId !== undefined && {
      displayId: normalizeIdLike(payload.displayId),
    }),
  };
}

async function parseError(res: Response): Promise<never> {
  let message = `HTTP ${res.status}`;

  try {
    const text = await res.text();

    if (!text) {
      throw new Error('empty');
    }

    try {
      const data = JSON.parse(text);

      if (typeof data?.message === 'string' && data.message.trim()) {
        message = data.message;
      } else if (Array.isArray(data?.message) && data.message.length) {
        message = data.message.join(', ');
      } else if (typeof data?.error === 'string' && data.error.trim()) {
        message = data.error;
      } else {
        message = text;
      }
    } catch {
      message = text;
    }
  } catch {
    // ignore
  }

  throw new Error(message);
}

async function privateRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    await parseError(res);
  }

  if (res.status === 204) {
    return null as T;
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

async function publicRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    await parseError(res);
  }

  if (res.status === 204) {
    return null as T;
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

// ===== Админский CRUD =====

export async function fetchDemoDisplays(): Promise<DemoDisplay[]> {
  return privateRequest<DemoDisplay[]>('/demo-displays');
}

export async function createDemoDisplay(
  payload: CreateDemoDisplayPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>('/demo-displays', {
    method: 'POST',
    body: JSON.stringify(normalizeCreatePayload(payload)),
  });
}

export async function updateDemoDisplay(
  id: string,
  payload: UpdateDemoDisplayPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>(
    `/demo-displays/${encodeURIComponent(trimString(id))}`,
    {
      method: 'PATCH',
      body: JSON.stringify(normalizeUpdatePayload(payload)),
    },
  );
}

export async function deleteDemoDisplay(id: string): Promise<void> {
  await privateRequest<void>(`/demo-displays/${encodeURIComponent(trimString(id))}`, {
    method: 'DELETE',
  });
}

// ===== Мой экран (clean API) =====

export async function fetchMyDemoDisplay(): Promise<DemoDisplay | null> {
  return privateRequest<DemoDisplay | null>('/demo-displays/me');
}

export async function createMyDemoDisplay(
  payload: CreateMyDemoDisplayPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>('/demo-displays/me', {
    method: 'POST',
    body: JSON.stringify(normalizeMyCreatePayload(payload)),
  });
}

export async function updateMyDemoDisplay(
  payload: UpdateMyDemoDisplayPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>('/demo-displays/me', {
    method: 'PATCH',
    body: JSON.stringify(normalizeMyUpdatePayload(payload)),
  });
}

export async function setMyDemoEnabled(
  payload: SetDemoEnabledPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>('/demo-displays/me/set-demo-enabled', {
    method: 'POST',
    body: JSON.stringify({
      enabled: payload.enabled,
      ...(payload.displayId !== undefined && {
        displayId: normalizeIdLike(payload.displayId),
      }),
    }),
  });
}

export async function syncMyViewerState(
  payload: SyncViewerStatePayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>('/demo-displays/me/sync-viewer-state', {
    method: 'POST',
    body: JSON.stringify(normalizeSyncViewerStatePayload(payload)),
  });
}

export async function touchMyViewer(
  payload?: { displayId?: string | null },
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>('/demo-displays/me/touch-viewer', {
    method: 'POST',
    body: JSON.stringify(
      payload?.displayId
        ? { displayId: normalizeIdLike(payload.displayId) }
        : {},
    ),
  });
}

export async function clearMyViewer(
  payload?: { displayId?: string | null },
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>('/demo-displays/me/clear-viewer', {
    method: 'POST',
    body: JSON.stringify(
      payload?.displayId
        ? { displayId: normalizeIdLike(payload.displayId) }
        : {},
    ),
  });
}

export async function setMyAutoplay(
  payload: SetAutoplayOnDemoPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>('/demo-displays/me/set-autoplay', {
    method: 'POST',
    body: JSON.stringify(normalizeSetAutoplayPayload(payload)),
  });
}

// ===== Переходный helper =====

export async function upsertMyDemoDisplay(
  payload: UpsertMyDemoDisplayPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>('/demo-displays/my/upsert', {
    method: 'POST',
    body: JSON.stringify(normalizeMyDisplayPayload(payload)),
  });
}

// ===== Старый слой: сотрудник ↔ demo display по id =====

export async function assignPresenterToDemoDisplay(
  id: string,
  payload: AssignPresenterPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>(
    `/demo-displays/${encodeURIComponent(trimString(id))}/assign-presenter`,
    {
      method: 'POST',
      body: JSON.stringify({
        presenterUserId: normalizeIdLike(payload.presenterUserId),
      }),
    },
  );
}

export async function setDemoEnabledOnDemoDisplay(
  id: string,
  payload: SetDemoEnabledPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>(
    `/demo-displays/${encodeURIComponent(trimString(id))}/set-demo-enabled`,
    {
      method: 'POST',
      body: JSON.stringify({
        enabled: payload.enabled,
      }),
    },
  );
}

export async function syncViewerStateOnDemoDisplay(
  id: string,
  payload: SyncViewerStatePayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>(
    `/demo-displays/${encodeURIComponent(trimString(id))}/sync-viewer-state`,
    {
      method: 'POST',
      body: JSON.stringify(normalizeSyncViewerStatePayload(payload)),
    },
  );
}

export async function touchViewerOnDemoDisplay(
  id: string,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>(
    `/demo-displays/${encodeURIComponent(trimString(id))}/touch-viewer`,
    {
      method: 'POST',
    },
  );
}

// ===== Пинг телевизора =====

export async function pingDemoDisplay(code: string): Promise<void> {
  await publicRequest<void>(`/demo-displays/${encodeURIComponent(trimString(code))}/ping`, {
    method: 'POST',
  });
}

// ===== Управление показом на ТВ (ручные id-based ручки) =====

export async function showUnitOnDemoDisplay(
  id: string,
  payload: ShowUnitOnDemoPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>(
    `/demo-displays/${encodeURIComponent(trimString(id))}/show-unit`,
    {
      method: 'POST',
      body: JSON.stringify(normalizeShowUnitPayload(payload)),
    },
  );
}

export async function setAutoplayOnDemoDisplay(
  id: string,
  payload: SetAutoplayOnDemoPayload,
): Promise<DemoDisplay> {
  return privateRequest<DemoDisplay>(
    `/demo-displays/${encodeURIComponent(trimString(id))}/set-autoplay`,
    {
      method: 'POST',
      body: JSON.stringify(normalizeSetAutoplayPayload(payload)),
    },
  );
}

// ===== Публичные методы для телевизора =====

export async function fetchDemoDisplaysPublicList(): Promise<
  DemoDisplayPublic[]
> {
  return publicRequest<DemoDisplayPublic[]>('/public/demo-displays');
}

export async function fetchDemoDisplayPublic(
  code: string,
): Promise<DemoDisplayPublic> {
  return publicRequest<DemoDisplayPublic>(
    `/public/demo-displays/${encodeURIComponent(trimString(code))}`,
  );
}