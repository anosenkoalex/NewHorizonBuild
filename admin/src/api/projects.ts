// admin/src/api/projects.ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// тот же ключ, что и в AuthContext
const STORAGE_TOKEN_KEY = 'nhb_token';

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;

  // 3D-часть
  threeDModelUrl?: string | null;
  threeDModelFormat?: string | null;
  threeDPreviewImage?: string | null;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Не удалось загрузить список проектов');
  }

  return res.json();
}

// payload для обновления 3D-поля у проекта
export interface UpdateProject3DPayload {
  threeDModelUrl?: string | null;
  threeDModelFormat?: string | null;
  threeDPreviewImage?: string | null;
}

export async function updateProject3D(
  projectId: string,
  payload: UpdateProject3DPayload,
): Promise<Project> {
  const res = await fetch(`${API_URL}/projects/${projectId}/3d`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Не удалось обновить 3D-модель проекта: ${text}`);
  }

  return res.json();
}
