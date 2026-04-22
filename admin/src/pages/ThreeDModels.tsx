import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchProjects,
  updateProject3D,
  uploadProject3DModel,
  type Project,
} from '../api/projects';
import {
  fetchUnits,
  type Unit,
  type UnitPlanVariant,
  fetchUnitPlanVariants,
  createUnitPlanVariant,
  updateUnitPlanVariant as apiUpdateUnitPlanVariant,
  deleteUnitPlanVariant,
  updateUnitPlanImageUrl,
} from '../api/units';
import {
  deleteProject3DBinding,
  fetchProject3DBindingsByProject,
  upsertUnitPrimaryProject3DBinding,
  type Project3DBinding,
} from '../api/project3DBindings';

const API_BASE = (() => {
  const raw = String(import.meta.env.VITE_API_URL ?? 'http://localhost:3000').trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

const STORAGE_TOKEN_KEY = 'nhb_token';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function getErrorMessageFromResponse(res: Response): Promise<string> {
  const rawText = await res.text();

  if (!rawText) {
    return `HTTP ${res.status}`;
  }

  try {
    const parsed = JSON.parse(rawText);

    if (typeof parsed?.message === 'string') {
      return parsed.message;
    }

    if (Array.isArray(parsed?.message)) {
      return parsed.message.join(', ');
    }

    if (typeof parsed?.error === 'string') {
      return parsed.error;
    }

    return rawText;
  } catch {
    return rawText;
  }
}

type UnitDraft = {
  modelElementKey?: string | null;
  planImageUrl?: string | null;
  planUploading?: boolean;
  saving?: boolean;
  message?: string | null;
};

type Project3DDraft = {
  modelUrl: string;
  modelFormat: string;
  previewUrl: string;
  savingMeta?: boolean;
  uploadingFile?: boolean;
  message?: string | null;
};

type UnitVariantsForm = {
  name: string;
  code: string;
  area: string;
  rooms: string;
  planImageUrl: string;
  isDefault: boolean;
};

type UnitVariantsState = {
  expanded: boolean;
  loading: boolean;
  error: string | null;
  items: UnitPlanVariant[];
  adding: boolean;
  form: UnitVariantsForm;
  savingVariantId?: string;
  deletingVariantId?: string;
};

type ProjectBindingsState = {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  items: Project3DBinding[];
};

type ProjectDraftField = 'modelUrl' | 'modelFormat' | 'previewUrl';
type UnitDraftField = 'modelElementKey' | 'planImageUrl';

const defaultVariantsForm: UnitVariantsForm = {
  name: '',
  code: '',
  area: '',
  rooms: '',
  planImageUrl: '',
  isDefault: false,
};

function createDefaultProjectDraft(project?: Project): Project3DDraft {
  return {
    modelUrl: project?.threeDModelUrl ?? '',
    modelFormat: project?.threeDModelFormat ?? '',
    previewUrl: project?.threeDPreviewImage ?? '',
    savingMeta: false,
    uploadingFile: false,
    message: null,
  };
}

function createDefaultUnitDraft(unit?: Unit): UnitDraft {
  return {
    modelElementKey: unit?.modelElementKey ?? '',
    planImageUrl: unit?.planImageUrl ?? '',
    planUploading: false,
    saving: false,
    message: null,
  };
}

function createDefaultVariantsState(): UnitVariantsState {
  return {
    expanded: false,
    loading: false,
    error: null,
    items: [],
    adding: false,
    form: { ...defaultVariantsForm },
    savingVariantId: undefined,
    deletingVariantId: undefined,
  };
}

function createEmptyBindingsState(): ProjectBindingsState {
  return {
    loaded: false,
    loading: false,
    error: null,
    items: [],
  };
}

function getUnitVariantsStateFromMap(
  map: Record<string, UnitVariantsState>,
  unitId: string,
): UnitVariantsState {
  return map[unitId] ?? createDefaultVariantsState();
}

function getProjectAddress(project: Project): string {
  return project.address ?? '';
}

function getProjectModelUrl(project: Project, draft?: Project3DDraft): string {
  return draft?.modelUrl || project.threeDModelUrl || '';
}

function getProjectPreviewUrl(project: Project, draft?: Project3DDraft): string {
  return draft?.previewUrl || project.threeDPreviewImage || '';
}

function getProjectModelFormat(project: Project, draft?: Project3DDraft): string {
  return draft?.modelFormat || project.threeDModelFormat || '';
}

function getPrimaryUnitBinding(
  unitId: string,
  bindingsState?: ProjectBindingsState,
): Project3DBinding | null {
  if (!bindingsState?.items?.length) return null;

  return (
    bindingsState.items.find(
      (binding) =>
        binding.targetType === 'UNIT' &&
        binding.unitId === unitId &&
        binding.isPrimary,
    ) ?? null
  );
}

function getUnitBindingKey(
  unit: Unit,
  unitDrafts: Record<string, UnitDraft>,
  bindingsState?: ProjectBindingsState,
): string {
  const draft = unitDrafts[unit.id];

  if (draft && Object.prototype.hasOwnProperty.call(draft, 'modelElementKey')) {
    return draft.modelElementKey ?? '';
  }

  const primaryBinding = getPrimaryUnitBinding(unit.id, bindingsState);
  if (primaryBinding?.nodeKey) {
    return primaryBinding.nodeKey;
  }

  return unit.modelElementKey ?? '';
}

function getUnitBasePlanUrl(
  unit: Unit,
  unitDrafts: Record<string, UnitDraft>,
): string {
  return unitDrafts[unit.id]?.planImageUrl ?? unit.planImageUrl ?? '';
}

function getUnitLabel(unit: Unit): string {
  const parts: string[] = [];

  if (unit.number) parts.push(String(unit.number));
  if (unit.rooms) parts.push(`${unit.rooms} комн.`);
  if (unit.area) parts.push(`${unit.area} м²`);

  return parts.join(' • ') || `Юнит ${unit.id.slice(0, 6)}…`;
}

function groupUnitsByBuilding(list: Unit[]) {
  const map: Record<string, Unit[]> = {};

  list.forEach((u) => {
    const buildingId = u.buildingId || 'NO_BUILDING';
    if (!map[buildingId]) map[buildingId] = [];
    map[buildingId].push(u);
  });

  return map;
}

const pillBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.45))',
  background: 'var(--nh-bg-elevated,#ffffff)',
  color: 'var(--nh-text-main,#0f172a)',
  fontSize: 11,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const ThreeDModelsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const [projectDrafts, setProjectDrafts] = useState<Record<string, Project3DDraft>>(
    {},
  );
  const [unitDrafts, setUnitDrafts] = useState<Record<string, UnitDraft>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(
    {},
  );
  const [projectBindings, setProjectBindings] = useState<
    Record<string, ProjectBindingsState>
  >({});
  const [showOnlyWithoutKey, setShowOnlyWithoutKey] = useState(false);
  const [projectQuery, setProjectQuery] = useState('');
  const [unitVariants, setUnitVariants] = useState<
    Record<string, UnitVariantsState>
  >({});

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        setProjectsLoading(true);
        setProjectsError(null);

        const data = await fetchProjects();
        if (cancelled) return;

        setProjects(data);

        const drafts: Record<string, Project3DDraft> = {};
        data.forEach((project) => {
          drafts[project.id] = createDefaultProjectDraft(project);
        });
        setProjectDrafts(drafts);

        if (data[0]) {
          setExpandedProjects((prev) =>
            Object.keys(prev).length > 0 ? prev : { [data[0].id]: true },
          );
        }
      } catch (e: any) {
        if (cancelled) return;
        setProjectsError(e?.message ?? 'Ошибка загрузки списка объектов');
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUnits = async () => {
      try {
        setUnitsLoading(true);
        setUnitsError(null);
        setUnits([]);

        const data = await fetchUnits({});
        if (cancelled) return;

        const list = data as Unit[];
        setUnits(list);

        const drafts: Record<string, UnitDraft> = {};
        list.forEach((unit) => {
          drafts[unit.id] = createDefaultUnitDraft(unit);
        });
        setUnitDrafts(drafts);
      } catch (e: any) {
        if (cancelled) return;
        setUnitsError(e?.message ?? 'Ошибка загрузки домов и квартир');
      } finally {
        if (!cancelled) {
          setUnitsLoading(false);
        }
      }
    };

    void loadUnits();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadProjectBindings = async (
    projectId: string,
    options?: { force?: boolean },
  ) => {
    const current = projectBindings[projectId] ?? createEmptyBindingsState();
    const force = options?.force ?? false;

    if (current.loaded && !force) {
      return;
    }

    setProjectBindings((prev) => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] ?? createEmptyBindingsState()),
        loading: true,
        error: null,
      },
    }));

    try {
      const items = await fetchProject3DBindingsByProject(projectId);

      setProjectBindings((prev) => ({
        ...prev,
        [projectId]: {
          loaded: true,
          loading: false,
          error: null,
          items,
        },
      }));
    } catch (e: any) {
      setProjectBindings((prev) => ({
        ...prev,
        [projectId]: {
          ...(prev[projectId] ?? createEmptyBindingsState()),
          loaded: false,
          loading: false,
          error: e?.message ?? 'Ошибка загрузки bindings',
          items: prev[projectId]?.items ?? [],
        },
      }));
    }
  };

  useEffect(() => {
    const expandedIds = Object.entries(expandedProjects)
      .filter(([, isOpen]) => isOpen)
      .map(([projectId]) => projectId);

    expandedIds.forEach((projectId) => {
      void loadProjectBindings(projectId);
    });
  }, [expandedProjects]);

  const unitsByProject = useMemo(() => {
    const map: Record<string, Unit[]> = {};

    units.forEach((unit) => {
      const pid = unit.projectId;
      if (!pid) return;

      if (!map[pid]) map[pid] = [];
      map[pid].push(unit);
    });

    return map;
  }, [units]);

  const filteredProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    if (!q) return projects;

    return projects.filter((project) => {
      const haystack = [
        project.name,
        getProjectAddress(project),
        getProjectModelUrl(project, projectDrafts[project.id]),
        getProjectModelFormat(project, projectDrafts[project.id]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [projects, projectQuery, projectDrafts]);

  const workspaceSummary = useMemo(() => {
    const totalProjects = projects.length;

    let projectsWithModel = 0;
    let projectsWithPreview = 0;
    let totalUnits = 0;
    let linkedUnits = 0;
    let unlinkedUnits = 0;

    projects.forEach((project) => {
      const draft = projectDrafts[project.id];

      if (getProjectModelUrl(project, draft)) projectsWithModel += 1;
      if (getProjectPreviewUrl(project, draft)) projectsWithPreview += 1;

      const projectUnits = unitsByProject[project.id] ?? [];
      totalUnits += projectUnits.length;

      projectUnits.forEach((unit) => {
        if (getUnitBindingKey(unit, unitDrafts, projectBindings[project.id])) {
          linkedUnits += 1;
        } else {
          unlinkedUnits += 1;
        }
      });
    });

    return {
      totalProjects,
      projectsWithModel,
      projectsWithPreview,
      totalUnits,
      linkedUnits,
      unlinkedUnits,
    };
  }, [projects, projectDrafts, unitsByProject, unitDrafts, projectBindings]);

  const updateProjectDraftField = (
    projectId: string,
    field: ProjectDraftField,
    value: string,
  ) => {
    setProjectDrafts((prev) => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] ?? createDefaultProjectDraft()),
        [field]: value,
      },
    }));
  };

  const updateUnitDraftField = (
    unitId: string,
    field: UnitDraftField,
    value: string,
  ) => {
    setUnitDrafts((prev) => ({
      ...prev,
      [unitId]: {
        ...(prev[unitId] ?? createDefaultUnitDraft()),
        [field]: value,
      },
    }));
  };

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const uploadProjectModelFileHandler = async (projectId: string, file: File) => {
    setProjectDrafts((prev) => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] ?? createDefaultProjectDraft()),
        uploadingFile: true,
        message: null,
      },
    }));

    try {
      const updated = await uploadProject3DModel(projectId, file);

      setProjects((prev) =>
        prev.map((project) => (project.id === updated.id ? updated : project)),
      );

      setProjectDrafts((prev) => ({
        ...prev,
        [projectId]: {
          ...(prev[projectId] ?? createDefaultProjectDraft()),
          modelUrl: updated.threeDModelUrl ?? '',
          modelFormat: updated.threeDModelFormat ?? '',
          previewUrl: updated.threeDPreviewImage ?? '',
          uploadingFile: false,
          message: 'Файл загружен',
        },
      }));
    } catch (e: any) {
      setProjectDrafts((prev) => ({
        ...prev,
        [projectId]: {
          ...(prev[projectId] ?? createDefaultProjectDraft()),
          uploadingFile: false,
          message: e?.message ?? 'Ошибка загрузки файла',
        },
      }));
    }
  };

  const uploadUnitPlanFile = async (unitId: string, file: File) => {
    setUnitDrafts((prev) => ({
      ...prev,
      [unitId]: {
        ...(prev[unitId] ?? createDefaultUnitDraft()),
        planUploading: true,
        message: null,
      },
    }));

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`${API_BASE}/units/${unitId}/plan/upload`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: fd,
      });

      if (!res.ok) {
        throw new Error(await getErrorMessageFromResponse(res));
      }

      const updated: Unit = await res.json();

      setUnits((prev) => prev.map((unit) => (unit.id === updated.id ? updated : unit)));

      const url = updated.planImageUrl ?? '';

      setUnitDrafts((prev) => ({
        ...prev,
        [unitId]: {
          ...(prev[unitId] ?? createDefaultUnitDraft()),
          planUploading: false,
          planImageUrl: url,
          message: 'Файл загружен',
        },
      }));

      window.setTimeout(() => {
        setUnitDrafts((prev) => ({
          ...prev,
          [unitId]: {
            ...(prev[unitId] ?? createDefaultUnitDraft()),
            message: null,
          },
        }));
      }, 2500);
    } catch (e: any) {
      setUnitDrafts((prev) => ({
        ...prev,
        [unitId]: {
          ...(prev[unitId] ?? createDefaultUnitDraft()),
          planUploading: false,
          message: e?.message ?? 'Ошибка загрузки файла',
        },
      }));
    }
  };

  const handleSaveProject3D = async (projectId: string) => {
    const draft = projectDrafts[projectId];
    if (!draft) return;

    setProjectDrafts((prev) => ({
      ...prev,
      [projectId]: {
        ...draft,
        savingMeta: true,
        message: null,
      },
    }));

    try {
      const updated = await updateProject3D(projectId, {
        threeDModelUrl: draft.modelUrl || null,
        threeDModelFormat: draft.modelFormat || null,
        threeDPreviewImage: draft.previewUrl || null,
      });

      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId ? { ...project, ...updated } : project,
        ),
      );

      setProjectDrafts((prev) => ({
        ...prev,
        [projectId]: {
          modelUrl: updated.threeDModelUrl ?? '',
          modelFormat: updated.threeDModelFormat ?? '',
          previewUrl: updated.threeDPreviewImage ?? '',
          savingMeta: false,
          uploadingFile: prev[projectId]?.uploadingFile ?? false,
          message: 'Настройки 3D сохранены',
        },
      }));

      window.setTimeout(() => {
        setProjectDrafts((prev) => ({
          ...prev,
          [projectId]: {
            ...(prev[projectId] ?? createDefaultProjectDraft()),
            message: null,
          },
        }));
      }, 3000);
    } catch (e: any) {
      setProjectDrafts((prev) => ({
        ...prev,
        [projectId]: {
          ...(prev[projectId] ?? draft),
          savingMeta: false,
          message: e?.message ?? 'Ошибка сохранения настроек',
        },
      }));
    }
  };

  const handleSaveUnit = async (unitId: string) => {
    const draft = unitDrafts[unitId];
    if (!draft) return;

    const original = units.find((unit) => unit.id === unitId);
    if (!original) return;

    const projectId = String(original.projectId ?? '').trim();
    if (!projectId) {
      setUnitDrafts((prev) => ({
        ...prev,
        [unitId]: {
          ...(prev[unitId] ?? draft),
          saving: false,
          message: 'У юнита не найден projectId',
        },
      }));
      return;
    }

    setUnitDrafts((prev) => ({
      ...prev,
      [unitId]: {
        ...(prev[unitId] ?? createDefaultUnitDraft()),
        saving: true,
        message: null,
      },
    }));

    try {
      let current: Unit = original;

      const currentBindingsState =
        projectBindings[projectId] ?? createEmptyBindingsState();
      const currentPrimaryBinding = getPrimaryUnitBinding(unitId, currentBindingsState);

      const originalKey = currentPrimaryBinding?.nodeKey ?? original.modelElementKey ?? null;
      const nextKey = draft.modelElementKey === '' ? null : draft.modelElementKey ?? null;

      const nextPlan = draft.planImageUrl === '' ? null : draft.planImageUrl ?? null;
      const originalPlan = original.planImageUrl ?? null;

      if (nextKey !== originalKey) {
        if (nextKey) {
          await upsertUnitPrimaryProject3DBinding({
            projectId,
            unitId,
            nodeKey: nextKey,
          });
        } else if (currentPrimaryBinding?.id) {
          await deleteProject3DBinding(currentPrimaryBinding.id);
        }

        current = {
          ...current,
          modelElementKey: nextKey,
        };
      }

      if (nextPlan !== originalPlan) {
        const updatedUnit = await updateUnitPlanImageUrl(unitId, nextPlan);
        current = updatedUnit;
      }

      setUnits((prev) => prev.map((unit) => (unit.id === unitId ? current : unit)));

      await loadProjectBindings(projectId, { force: true });

      setUnitDrafts((prev) => ({
        ...prev,
        [unitId]: {
          ...(prev[unitId] ?? draft),
          saving: false,
          message: 'Сохранено',
        },
      }));

      window.setTimeout(() => {
        setUnitDrafts((prev) => ({
          ...prev,
          [unitId]: {
            ...(prev[unitId] ?? createDefaultUnitDraft()),
            message: null,
          },
        }));
      }, 2500);
    } catch (e: any) {
      setUnitDrafts((prev) => ({
        ...prev,
        [unitId]: {
          ...(prev[unitId] ?? draft),
          saving: false,
          message: e?.message ?? 'Ошибка сохранения',
        },
      }));
    }
  };

  const ensureUnitVariantsState = (unitId: string): UnitVariantsState => {
    return getUnitVariantsStateFromMap(unitVariants, unitId);
  };

  const loadUnitVariants = async (unitId: string) => {
    setUnitVariants((prev) => {
      const current = getUnitVariantsStateFromMap(prev, unitId);
      return {
        ...prev,
        [unitId]: {
          ...current,
          loading: true,
          error: null,
        },
      };
    });

    try {
      const items = await fetchUnitPlanVariants(unitId);

      setUnitVariants((prev) => {
        const current = getUnitVariantsStateFromMap(prev, unitId);
        return {
          ...prev,
          [unitId]: {
            ...current,
            loading: false,
            items,
          },
        };
      });
    } catch (e: any) {
      setUnitVariants((prev) => {
        const current = getUnitVariantsStateFromMap(prev, unitId);
        return {
          ...prev,
          [unitId]: {
            ...current,
            loading: false,
            error: e?.message ?? 'Ошибка загрузки вариантов',
          },
        };
      });
    }
  };

  const handleToggleVariants = (unitId: string) => {
    const current = ensureUnitVariantsState(unitId);
    const willExpand = !current.expanded;

    setUnitVariants((prev) => ({
      ...prev,
      [unitId]: {
        ...getUnitVariantsStateFromMap(prev, unitId),
        expanded: willExpand,
      },
    }));

    if (willExpand) {
      void loadUnitVariants(unitId);
    }
  };

  const updateVariantsFormField = (
    unitId: string,
    field: keyof UnitVariantsForm,
    value: string | boolean,
  ) => {
    setUnitVariants((prev) => {
      const current = getUnitVariantsStateFromMap(prev, unitId);
      return {
        ...prev,
        [unitId]: {
          ...current,
          form: {
            ...current.form,
            [field]: value,
          },
        },
      };
    });
  };

  const handleAddVariant = async (unitId: string) => {
    const state = ensureUnitVariantsState(unitId);
    const form = state.form;

    if (!form.name.trim()) {
      setUnitVariants((prev) => ({
        ...prev,
        [unitId]: {
          ...getUnitVariantsStateFromMap(prev, unitId),
          error: 'Укажите название варианта',
        },
      }));
      return;
    }

    setUnitVariants((prev) => ({
      ...prev,
      [unitId]: {
        ...getUnitVariantsStateFromMap(prev, unitId),
        adding: true,
        error: null,
      },
    }));

    try {
      const area =
        form.area.trim() !== '' ? Number(form.area.replace(',', '.')) : null;
      const rooms =
        form.rooms.trim() !== '' ? Number(form.rooms) : null;

      const created = await createUnitPlanVariant(unitId, {
        name: form.name.trim(),
        code: form.code.trim() ? form.code.trim() : null,
        description: null,
        area: !Number.isNaN(area as number) ? area : null,
        rooms: !Number.isNaN(rooms as number) ? rooms : null,
        isDefault: form.isDefault,
        planImageUrl: form.planImageUrl.trim() ? form.planImageUrl.trim() : null,
      });

      setUnitVariants((prev) => {
        const current = getUnitVariantsStateFromMap(prev, unitId);
        const items = [...current.items, created].sort((a, b) => {
          if (a.isDefault === b.isDefault) return 0;
          return a.isDefault ? -1 : 1;
        });

        return {
          ...prev,
          [unitId]: {
            ...current,
            adding: false,
            items,
            form: { ...defaultVariantsForm },
          },
        };
      });
    } catch (e: any) {
      setUnitVariants((prev) => {
        const current = getUnitVariantsStateFromMap(prev, unitId);
        return {
          ...prev,
          [unitId]: {
            ...current,
            adding: false,
            error: e?.message ?? 'Ошибка создания варианта',
          },
        };
      });
    }
  };

  const handleMakeVariantDefault = async (
    unitId: string,
    variantId: string,
  ) => {
    setUnitVariants((prev) => {
      const current = getUnitVariantsStateFromMap(prev, unitId);
      return {
        ...prev,
        [unitId]: {
          ...current,
          savingVariantId: variantId,
          error: null,
        },
      };
    });

    try {
      const updated = await apiUpdateUnitPlanVariant(unitId, variantId, {
        isDefault: true,
      });

      setUnitVariants((prev) => {
        const current = getUnitVariantsStateFromMap(prev, unitId);
        return {
          ...prev,
          [unitId]: {
            ...current,
            savingVariantId: undefined,
            items: current.items.map((variant) =>
              variant.id === variantId
                ? updated
                : { ...variant, isDefault: false },
            ),
          },
        };
      });
    } catch (e: any) {
      setUnitVariants((prev) => {
        const current = getUnitVariantsStateFromMap(prev, unitId);
        return {
          ...prev,
          [unitId]: {
            ...current,
            savingVariantId: undefined,
            error: e?.message ?? 'Ошибка обновления варианта',
          },
        };
      });
    }
  };

  const handleDeleteVariant = async (unitId: string, variantId: string) => {
    setUnitVariants((prev) => {
      const current = getUnitVariantsStateFromMap(prev, unitId);
      return {
        ...prev,
        [unitId]: {
          ...current,
          deletingVariantId: variantId,
          error: null,
        },
      };
    });

    try {
      await deleteUnitPlanVariant(unitId, variantId);

      setUnitVariants((prev) => {
        const current = getUnitVariantsStateFromMap(prev, unitId);
        return {
          ...prev,
          [unitId]: {
            ...current,
            deletingVariantId: undefined,
            items: current.items.filter((variant) => variant.id !== variantId),
          },
        };
      });
    } catch (e: any) {
      setUnitVariants((prev) => {
        const current = getUnitVariantsStateFromMap(prev, unitId);
        return {
          ...prev,
          [unitId]: {
            ...current,
            deletingVariantId: undefined,
            error: e?.message ?? 'Ошибка удаления варианта',
          },
        };
      });
    }
  };

  return (
    <div className="page-inner">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            borderRadius: 18,
            border: '1px solid rgba(148,163,184,0.28)',
            background:
              'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(16,185,129,0.05))',
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              opacity: 0.68,
              marginBottom: 6,
            }}
          >
            Hidden owner-only 3D workspace
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: 900 }}>
              <h1 className="page-title" style={{ marginBottom: 6 }}>
                3D Workspace / Studio
              </h1>
              <p
                className="page-subtitle"
                style={{ fontSize: 13, marginBottom: 6 }}
              >
                Это скрытая рабочая зона для подготовки 3D-проектов: загрузка
                сцены, базовая настройка 3D-ассетов, привязка квартир к мешам,
                базовые планировки и варианты планировок.
              </p>
              <p
                style={{
                  fontSize: 11,
                  margin: 0,
                  color: 'var(--nh-text-muted,#6b7280)',
                  lineHeight: 1.55,
                }}
              >
                Ближайшая архитектура: <b>upload → normalize → bind → preset → publish</b>.
                Сейчас страница уже покрывает upload + bind + base planning layer.
                Binding layer теперь хранится отдельно через <b>project-3d-bindings</b>,
                а не только в Unit.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                alert(
                  'Новый объект (ЖК / ЦО) создаётся в разделе «Объекты».\n' +
                    'Здесь только hidden 3D workspace: ассеты, привязки, планировки и подготовка сцены.',
                );
              }}
              style={{
                ...pillBtn,
                padding: '8px 14px',
                background: 'var(--nh-accent-soft, rgba(56,189,248,0.08))',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Как добавить объект
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          {[
            {
              label: 'Проекты',
              value: workspaceSummary.totalProjects,
              hint: 'в hidden workspace',
            },
            {
              label: 'С 3D-моделью',
              value: workspaceSummary.projectsWithModel,
              hint: 'asset configured',
            },
            {
              label: 'С превью',
              value: workspaceSummary.projectsWithPreview,
              hint: 'preview ready',
            },
            {
              label: 'Всего юнитов',
              value: workspaceSummary.totalUnits,
              hint: 'в связанных проектах',
            },
            {
              label: 'Привязано к сцене',
              value: workspaceSummary.linkedUnits,
              hint: 'mesh binding ready',
            },
            {
              label: 'Без привязки',
              value: workspaceSummary.unlinkedUnits,
              hint: 'нужна ручная работа',
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                borderRadius: 14,
                border: '1px solid rgba(148,163,184,0.24)',
                background: 'var(--nh-card-bg,#ffffff)',
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.66,
                  marginBottom: 6,
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}
              >
                {card.value}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: 'var(--nh-text-muted,#6b7280)',
                }}
              >
                {card.hint}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              value={projectQuery}
              onChange={(e) => setProjectQuery(e.target.value)}
              placeholder="Поиск по проектам, адресу, URL модели..."
              style={{
                minWidth: 320,
                maxWidth: 460,
                width: '100%',
                padding: '9px 12px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.35)',
                background: 'var(--nh-input-bg,#ffffff)',
                color: 'var(--nh-text-main,#0f172a)',
                fontSize: 12,
                outline: 'none',
              }}
            />

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              <input
                type="checkbox"
                checked={showOnlyWithoutKey}
                onChange={(e) => setShowOnlyWithoutKey(e.target.checked)}
              />
              <span>Показывать только юниты без привязки к 3D-сцене</span>
            </label>
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'var(--nh-text-muted,#6b7280)',
            }}
          >
            Проектов в выдаче: <b>{filteredProjects.length}</b>
          </div>
        </div>
      </div>

      {projectsLoading && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 12,
            border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.35))',
            fontSize: 13,
          }}
        >
          Загрузка объектов...
        </div>
      )}

      {projectsError && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 12,
            border: '1px solid var(--nh-danger, rgba(248,113,113,0.7))',
            background: 'linear-gradient(135deg,rgba(248,113,113,0.08),transparent)',
            fontSize: 13,
            color: 'var(--nh-danger,#b91c1c)',
          }}
        >
          {projectsError}
        </div>
      )}

      {!projectsLoading && projects.length === 0 && !projectsError && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 12,
            border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.35))',
            fontSize: 13,
          }}
        >
          Пока нет ни одного объекта. Сначала создай ЖК / ЦО в разделе «Объекты», потом они появятся здесь.
        </div>
      )}

      {!projectsLoading && filteredProjects.length === 0 && projects.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 12,
            border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.35))',
            fontSize: 13,
          }}
        >
          По текущему фильтру ничего не найдено.
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          marginTop: 10,
        }}
      >
        {filteredProjects.map((project) => {
          const draft = projectDrafts[project.id] ?? createDefaultProjectDraft();
          const bindingsState = projectBindings[project.id] ?? createEmptyBindingsState();

          const projectUnitsAll = unitsByProject[project.id] ?? [];
          const projectUnits = showOnlyWithoutKey
            ? projectUnitsAll.filter(
                (unit) => !getUnitBindingKey(unit, unitDrafts, bindingsState),
              )
            : projectUnitsAll;

          const buildings = groupUnitsByBuilding(projectUnits);
          const address = getProjectAddress(project);

          const modelUrl = getProjectModelUrl(project, draft);
          const previewUrl = getProjectPreviewUrl(project, draft);
          const modelFormat = getProjectModelFormat(project, draft);

          const has3D = !!modelUrl;
          const hasPreview = !!previewUrl;
          const currentFileName = modelUrl
            ? modelUrl.split('/').pop()
            : 'Файл ещё не загружен';

          const totalUnits = projectUnitsAll.length;
          const linkedCount = projectUnitsAll.filter((unit) =>
            Boolean(getUnitBindingKey(unit, unitDrafts, bindingsState)),
          ).length;
          const notLinkedCount = totalUnits - linkedCount;

          const canEditUnits = !!modelUrl;
          const readyForViewer = has3D && totalUnits > 0 && notLinkedCount === 0;

          return (
            <section
              key={project.id}
              style={{
                borderRadius: 16,
                padding: 14,
                border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.28))',
                background: 'var(--nh-card-bg,#ffffff)',
                boxShadow: '0 10px 30px rgba(15,23,42,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ maxWidth: 860 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--nh-text-main,#0f172a)',
                    }}
                  >
                    {project.name}
                  </div>

                  {address && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--nh-text-muted,#6b7280)',
                        marginTop: 2,
                      }}
                    >
                      {address}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 8,
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 999,
                        backgroundColor: has3D
                          ? 'rgba(34,197,94,0.12)'
                          : 'rgba(148,163,184,0.16)',
                        color: has3D
                          ? 'var(--nh-success,#166534)'
                          : 'var(--nh-text-muted,#4b5563)',
                      }}
                    >
                      {has3D ? '3D asset configured' : '3D asset missing'}
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 999,
                        backgroundColor: hasPreview
                          ? 'rgba(59,130,246,0.12)'
                          : 'rgba(148,163,184,0.16)',
                        color: hasPreview ? '#1d4ed8' : 'var(--nh-text-muted,#4b5563)',
                      }}
                    >
                      {hasPreview ? 'Preview ready' : 'Preview missing'}
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 999,
                        backgroundColor: readyForViewer
                          ? 'rgba(34,197,94,0.12)'
                          : 'rgba(250,204,21,0.16)',
                        color: readyForViewer
                          ? 'var(--nh-success,#166534)'
                          : '#92400e',
                      }}
                    >
                      {readyForViewer ? 'Готов к Viewer' : 'Требуется подготовка'}
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--nh-text-muted,#6b7280)',
                      }}
                    >
                      Юнитов: {totalUnits}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--nh-text-muted,#6b7280)',
                      }}
                    >
                      Привязано: {linkedCount}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--nh-text-muted,#6b7280)',
                      }}
                    >
                      Без привязки: {notLinkedCount}
                    </span>

                    {modelFormat && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--nh-text-muted,#6b7280)',
                        }}
                      >
                        Формат: {modelFormat}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleProjectExpanded(project.id)}
                  style={pillBtn}
                >
                  {expandedProjects[project.id]
                    ? 'Свернуть workspace'
                    : 'Открыть workspace'}
                </button>
              </div>

              {expandedProjects[project.id] && (
                <div
                  style={{
                    marginTop: 12,
                    borderTop: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.35))',
                    paddingTop: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {[
                      {
                        title: 'Upload',
                        status: has3D ? 'готово' : 'нужно загрузить',
                        ok: has3D,
                        hint: currentFileName,
                      },
                      {
                        title: 'Preview',
                        status: hasPreview ? 'готово' : 'нет превью',
                        ok: hasPreview,
                        hint: previewUrl || 'не задано',
                      },
                      {
                        title: 'Bindings',
                        status:
                          totalUnits === 0
                            ? 'нет юнитов'
                            : notLinkedCount === 0
                            ? 'готово'
                            : `не привязано: ${notLinkedCount}`,
                        ok: totalUnits > 0 && notLinkedCount === 0,
                        hint:
                          totalUnits === 0
                            ? 'сначала создай юниты'
                            : `${linkedCount}/${totalUnits} привязано`,
                      },
                      {
                        title: 'Publish readiness',
                        status: readyForViewer ? 'можно публиковать' : 'ещё не готово',
                        ok: readyForViewer,
                        hint: readyForViewer ? 'viewer-ready' : 'нужна донастройка',
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        style={{
                          borderRadius: 12,
                          padding: 10,
                          border: item.ok
                            ? '1px solid rgba(34,197,94,0.32)'
                            : '1px solid rgba(148,163,184,0.26)',
                          background: item.ok
                            ? 'rgba(34,197,94,0.05)'
                            : 'rgba(148,163,184,0.04)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            opacity: 0.65,
                            marginBottom: 4,
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 4,
                          }}
                        >
                          {item.status}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--nh-text-muted,#6b7280)',
                            wordBreak: 'break-word',
                          }}
                        >
                          {item.hint}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      padding: 12,
                      background:
                        'linear-gradient(135deg,rgba(59,130,246,0.03),rgba(16,185,129,0.02))',
                      border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.32))',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: 'var(--nh-accent-soft, rgba(56,189,248,0.15))',
                        }}
                      >
                        Step 1
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--nh-text-main,#0f172a)',
                        }}
                      >
                        Scene asset / 3D-модель проекта
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: 11,
                        margin: 0,
                        color: 'var(--nh-text-muted,#6b7280)',
                        lineHeight: 1.55,
                      }}
                    >
                      Здесь задаётся основной 3D-ассет проекта. Сейчас используется
                      базовый upload flow. Следующий этап — отдельный OBJ pipeline:
                      upload → parse → normalize → convert → review → publish.
                    </p>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,1.05fr)',
                        gap: 10,
                        marginTop: 6,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--nh-text-main,#0f172a)',
                          }}
                        >
                          Основной файл сцены
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            fontSize: 11,
                          }}
                        >
                          <span
                            style={{
                              color: 'var(--nh-text-muted,#6b7280)',
                            }}
                          >
                            Текущий файл: <strong>{currentFileName}</strong>
                          </span>

                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 10px',
                              borderRadius: 999,
                              border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.45))',
                              background: 'var(--nh-input-bg,#ffffff)',
                              cursor: 'pointer',
                              width: 'fit-content',
                            }}
                          >
                            <input
                              type="file"
                              accept=".glb,.gltf,.obj,.fbx"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                void uploadProjectModelFileHandler(project.id, file);
                              }}
                            />
                            <span style={{ fontSize: 11 }}>
                              {draft.uploadingFile ? 'Загрузка...' : 'Выбрать 3D-файл'}
                            </span>
                          </label>

                          <span
                            style={{
                              color: 'var(--nh-text-muted,#6b7280)',
                              lineHeight: 1.45,
                            }}
                          >
                            Сейчас используются базовые upload-ручки. В дальнейшем
                            сюда логично добавить OBJ/MTL/ZIP pipeline с нормализацией
                            и конвертацией в viewer-friendly формат.
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <label style={{ fontSize: 12 }}>
                          URL модели
                          <input
                            type="text"
                            value={draft.modelUrl}
                            onChange={(e) =>
                              updateProjectDraftField(project.id, 'modelUrl', e.target.value)
                            }
                            placeholder="URL модели"
                            style={{
                              marginTop: 3,
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: 10,
                              border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.45))',
                              background: 'var(--nh-input-bg,#ffffff)',
                              color: 'var(--nh-text-main,#0f172a)',
                              fontSize: 12,
                            }}
                          />
                        </label>

                        <label style={{ fontSize: 12 }}>
                          Preview image URL
                          <input
                            type="text"
                            value={draft.previewUrl}
                            onChange={(e) =>
                              updateProjectDraftField(project.id, 'previewUrl', e.target.value)
                            }
                            placeholder="URL превью (из медиатеки)"
                            style={{
                              marginTop: 3,
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: 10,
                              border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.45))',
                              background: 'var(--nh-input-bg,#ffffff)',
                              color: 'var(--nh-text-main,#0f172a)',
                              fontSize: 12,
                            }}
                          />
                        </label>

                        <label style={{ fontSize: 12 }}>
                          Scene format label
                          <input
                            type="text"
                            value={draft.modelFormat}
                            onChange={(e) =>
                              updateProjectDraftField(project.id, 'modelFormat', e.target.value)
                            }
                            placeholder="Например: GLB / OBJ / GLTF"
                            style={{
                              marginTop: 3,
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: 10,
                              border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.45))',
                              background: 'var(--nh-input-bg,#ffffff)',
                              color: 'var(--nh-text-main,#0f172a)',
                              fontSize: 12,
                            }}
                          />
                        </label>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 4,
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => void handleSaveProject3D(project.id)}
                            disabled={draft.savingMeta}
                            style={{
                              padding: '7px 13px',
                              borderRadius: 999,
                              border: 'none',
                              background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                              color: '#ffffff',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: draft.savingMeta ? 'default' : 'pointer',
                              opacity: draft.savingMeta ? 0.7 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {draft.savingMeta ? 'Сохранение...' : 'Сохранить метаданные'}
                          </button>

                          {draft.message && (
                            <span
                              style={{
                                fontSize: 11,
                                color: 'var(--nh-text-muted,#6b7280)',
                              }}
                            >
                              {draft.message}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      padding: 12,
                      border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.28))',
                      background: 'var(--nh-bg-elevated,#f9fafb)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: 'var(--nh-accent-soft, rgba(56,189,248,0.15))',
                          }}
                        >
                          Step 2
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--nh-text-main,#0f172a)',
                          }}
                        >
                          Mesh binding / привязка квартир и домов к сцене
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: bindingsState.error
                            ? 'var(--nh-danger,#b91c1c)'
                            : 'var(--nh-text-muted,#6b7280)',
                        }}
                      >
                        {bindingsState.loading
                          ? 'Загрузка bindings...'
                          : bindingsState.error
                          ? bindingsState.error
                          : bindingsState.loaded
                          ? `Bindings loaded: ${bindingsState.items.length}`
                          : 'Bindings ещё не загружены'}
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: 11,
                        margin: 0,
                        color: 'var(--nh-text-muted,#6b7280)',
                        lineHeight: 1.55,
                      }}
                    >
                      Для каждого юнита укажи <strong>modelElementKey</strong> — ключ
                      элемента в общей сцене. Теперь это сохраняется через отдельный
                      binding layer, а Unit.modelElementKey используется уже как
                      синхронизированное runtime-поле.
                    </p>

                    {!canEditUnits && (
                      <div
                        style={{
                          marginTop: 4,
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: '1px dashed rgba(239,68,68,0.5)',
                          background: 'rgba(254,226,226,0.6)',
                          fontSize: 11,
                          color: 'var(--nh-danger,#b91c1c)',
                        }}
                      >
                        Сначала выполни Step 1: загрузи 3D-модель проекта и сохрани
                        её метаданные. После этого поля привязки станут активны.
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4,
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--nh-text-muted,#6b7280)',
                        }}
                      >
                        Юнитов в проекте: {projectUnits.length}
                      </span>

                      {unitsLoading && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--nh-text-muted,#6b7280)',
                          }}
                        >
                          Загрузка юнитов...
                        </span>
                      )}

                      {unitsError && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--nh-danger,#b91c1c)',
                          }}
                        >
                          {unitsError}
                        </span>
                      )}
                    </div>

                    {!unitsLoading && !unitsError && projectUnits.length === 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--nh-text-muted,#6b7280)',
                        }}
                      >
                        Для этого проекта пока нет юнитов. Их нужно сначала создать в
                        основном разделе «Объекты».
                      </div>
                    )}

                    {!unitsLoading && !unitsError && projectUnits.length > 0 && (
                      <div
                        style={{
                          marginTop: 6,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          maxHeight: 460,
                          overflowY: 'auto',
                          paddingRight: 4,
                        }}
                      >
                        {Object.entries(buildings).map(([buildingId, buildingUnits]) => {
                          const title =
                            buildingId === 'NO_BUILDING'
                              ? 'Без корпуса / дом не указан'
                              : `Дом ${buildingId}`;

                          return (
                            <div
                              key={buildingId}
                              style={{
                                borderRadius: 12,
                                border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.3))',
                                padding: 8,
                                background: 'var(--nh-row-bg, rgba(148,163,184,0.04))',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: 6,
                                  flexWrap: 'wrap',
                                  gap: 8,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                  }}
                                >
                                  {title}
                                </div>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: 'var(--nh-text-muted,#6b7280)',
                                  }}
                                >
                                  Юнитов: {buildingUnits.length}
                                </span>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 6,
                                }}
                              >
                                {buildingUnits.map((unit) => {
                                  const d = unitDrafts[unit.id] ?? createDefaultUnitDraft();
                                  const unitDisabled = !canEditUnits;
                                  const bindingKey = getUnitBindingKey(
                                    unit,
                                    unitDrafts,
                                    bindingsState,
                                  );
                                  const basePlanUrl = getUnitBasePlanUrl(unit, unitDrafts);

                                  const canOpenVariants = canEditUnits && !!(bindingKey || basePlanUrl);
                                  const planFileName = basePlanUrl
                                    ? basePlanUrl.split('/').pop()
                                    : null;

                                  const variantsState = ensureUnitVariantsState(unit.id);
                                  const effectiveVariants = variantsState.items;

                                  return (
                                    <div
                                      key={unit.id}
                                      style={{
                                        borderRadius: 10,
                                        border: '1px solid rgba(148,163,184,0.4)',
                                        background: 'var(--nh-card-bg,#ffffff)',
                                        padding: 8,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: 'minmax(0,0.9fr) minmax(0,1.6fr) auto',
                                          gap: 6,
                                          alignItems: 'center',
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: 11,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 2,
                                          }}
                                        >
                                          <span style={{ fontWeight: 700 }}>
                                            {getUnitLabel(unit)}
                                          </span>

                                          {unit.status && (
                                            <span
                                              style={{
                                                color: 'var(--nh-text-muted,#6b7280)',
                                              }}
                                            >
                                              Статус: {unit.status}
                                            </span>
                                          )}

                                          {unit.sectionId && (
                                            <span
                                              style={{
                                                color: 'var(--nh-text-muted,#6b7280)',
                                              }}
                                            >
                                              Секция: {unit.sectionId}
                                            </span>
                                          )}

                                          {unit.floorId && (
                                            <span
                                              style={{
                                                color: 'var(--nh-text-muted,#6b7280)',
                                              }}
                                            >
                                              Этаж: {unit.floorId}
                                            </span>
                                          )}
                                        </div>

                                        <div
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 4,
                                          }}
                                        >
                                          <input
                                            type="text"
                                            placeholder="Ключ элемента в общей 3D-сцене (modelElementKey)"
                                            value={bindingKey}
                                            disabled={unitDisabled}
                                            onChange={(e) =>
                                              updateUnitDraftField(
                                                unit.id,
                                                'modelElementKey',
                                                e.target.value,
                                              )
                                            }
                                            style={{
                                              width: '100%',
                                              padding: '6px 8px',
                                              borderRadius: 8,
                                              border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.45))',
                                              background: 'var(--nh-input-bg,#ffffff)',
                                              color: 'var(--nh-text-main,#0f172a)',
                                              fontSize: 11,
                                            }}
                                          />

                                          <div
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: 3,
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: 11,
                                                color: 'var(--nh-text-muted,#6b7280)',
                                              }}
                                            >
                                              Базовая планировка / файл юнита
                                            </span>

                                            <label
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '5px 9px',
                                                borderRadius: 999,
                                                border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.45))',
                                                background: 'var(--nh-input-bg,#ffffff)',
                                                cursor: unitDisabled ? 'default' : 'pointer',
                                                opacity: unitDisabled ? 0.6 : 1,
                                                width: 'fit-content',
                                              }}
                                            >
                                              <input
                                                type="file"
                                                accept=".png,.jpg,.jpeg,.webp"
                                                style={{ display: 'none' }}
                                                disabled={unitDisabled}
                                                onChange={(e) => {
                                                  if (unitDisabled) return;
                                                  const file = e.target.files?.[0];
                                                  if (!file) return;
                                                  void uploadUnitPlanFile(unit.id, file);
                                                }}
                                              />
                                              <span style={{ fontSize: 11 }}>
                                                {d.planUploading
                                                  ? 'Загрузка...'
                                                  : basePlanUrl
                                                  ? 'Заменить файл'
                                                  : 'Добавить файл'}
                                              </span>
                                            </label>

                                            {planFileName && (
                                              <span
                                                style={{
                                                  fontSize: 10,
                                                  color: 'var(--nh-text-muted,#6b7280)',
                                                }}
                                              >
                                                Текущий файл: <strong>{planFileName}</strong>
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-end',
                                            gap: 4,
                                          }}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => void handleSaveUnit(unit.id)}
                                            disabled={unitDisabled || d.saving || d.planUploading}
                                            style={{
                                              padding: '6px 10px',
                                              borderRadius: 999,
                                              border: 'none',
                                              background:
                                                'var(--nh-accent-soft, rgba(56,189,248,0.18))',
                                              color: 'var(--nh-accent-text,#0f172a)',
                                              fontSize: 11,
                                              fontWeight: 700,
                                              cursor:
                                                unitDisabled || d.saving || d.planUploading
                                                  ? 'default'
                                                  : 'pointer',
                                              opacity:
                                                unitDisabled || d.saving || d.planUploading
                                                  ? 0.7
                                                  : 1,
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            {d.saving ? 'Сохранение…' : 'Сохранить'}
                                          </button>

                                          {d.message && (
                                            <span
                                              style={{
                                                fontSize: 10,
                                                color: 'var(--nh-text-muted,#6b7280)',
                                              }}
                                            >
                                              {d.message}
                                            </span>
                                          )}

                                          <button
                                            type="button"
                                            disabled={unitDisabled}
                                            onClick={() => {
                                              if (!canOpenVariants) {
                                                alert(
                                                  'Сначала сохрани modelElementKey или базовую планировку для этого юнита.',
                                                );
                                                return;
                                              }
                                              handleToggleVariants(unit.id);
                                            }}
                                            style={{
                                              marginTop: 2,
                                              padding: '4px 8px',
                                              borderRadius: 999,
                                              border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.5))',
                                              background: 'var(--nh-bg-elevated,#ffffff)',
                                              fontSize: 10,
                                              cursor: unitDisabled ? 'default' : 'pointer',
                                              opacity: unitDisabled ? 0.6 : 1,
                                            }}
                                          >
                                            Варианты ({effectiveVariants.length}){' '}
                                            {variantsState.expanded ? '▲' : '▼'}
                                          </button>
                                        </div>
                                      </div>

                                      {variantsState.expanded && (
                                        <div
                                          style={{
                                            marginTop: 4,
                                            borderTop: '1px dashed rgba(148,163,184,0.6)',
                                            paddingTop: 6,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 6,
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                padding: '1px 7px',
                                                borderRadius: 999,
                                                background: 'rgba(56,189,248,0.15)',
                                              }}
                                            >
                                              Step 3
                                            </span>
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                              }}
                                            >
                                              Варианты планировок
                                            </span>
                                          </div>

                                          {variantsState.loading && (
                                            <div
                                              style={{
                                                fontSize: 11,
                                                color: 'var(--nh-text-muted,#6b7280)',
                                              }}
                                            >
                                              Загрузка вариантов...
                                            </div>
                                          )}

                                          {variantsState.error && (
                                            <div
                                              style={{
                                                fontSize: 11,
                                                color: 'var(--nh-danger,#b91c1c)',
                                              }}
                                            >
                                              {variantsState.error}
                                            </div>
                                          )}

                                          {!variantsState.loading &&
                                            effectiveVariants.length === 0 && (
                                              <div
                                                style={{
                                                  fontSize: 11,
                                                  color: 'var(--nh-text-muted,#6b7280)',
                                                }}
                                              >
                                                Пока нет вариантов планировок.
                                              </div>
                                            )}

                                          {effectiveVariants.length > 0 && (
                                            <div
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                              }}
                                            >
                                              {effectiveVariants.map((variant) => {
                                                const isSaving =
                                                  variantsState.savingVariantId === variant.id;
                                                const isDeleting =
                                                  variantsState.deletingVariantId === variant.id;

                                                return (
                                                  <div
                                                    key={variant.id}
                                                    style={{
                                                      borderRadius: 8,
                                                      padding: '4px 6px',
                                                      border: '1px solid rgba(148,163,184,0.5)',
                                                      background: 'rgba(255,255,255,0.9)',
                                                      display: 'flex',
                                                      justifyContent: 'space-between',
                                                      alignItems: 'center',
                                                      gap: 6,
                                                    }}
                                                  >
                                                    <div
                                                      style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 2,
                                                        fontSize: 11,
                                                      }}
                                                    >
                                                      <div
                                                        style={{
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          gap: 6,
                                                          flexWrap: 'wrap',
                                                        }}
                                                      >
                                                        <span
                                                          style={{
                                                            fontWeight: 700,
                                                          }}
                                                        >
                                                          {variant.name}
                                                        </span>

                                                        {variant.isDefault && (
                                                          <span
                                                            style={{
                                                              fontSize: 9,
                                                              padding: '1px 6px',
                                                              borderRadius: 999,
                                                              background: 'rgba(34,197,94,0.17)',
                                                              color: 'var(--nh-success,#166534)',
                                                            }}
                                                          >
                                                            по умолчанию
                                                          </span>
                                                        )}
                                                      </div>

                                                      <div
                                                        style={{
                                                          display: 'flex',
                                                          flexWrap: 'wrap',
                                                          gap: 6,
                                                          color: 'var(--nh-text-muted,#6b7280)',
                                                        }}
                                                      >
                                                        {variant.area && (
                                                          <span>Площадь: {variant.area} м²</span>
                                                        )}
                                                        {variant.rooms && (
                                                          <span>Комнат: {variant.rooms}</span>
                                                        )}
                                                        {variant.code && (
                                                          <span>Код: {variant.code}</span>
                                                        )}
                                                      </div>

                                                      {variant.planImageUrl && (
                                                        <span
                                                          style={{
                                                            fontSize: 10,
                                                            color: 'var(--nh-text-muted,#6b7280)',
                                                          }}
                                                        >
                                                          План: {variant.planImageUrl}
                                                        </span>
                                                      )}
                                                    </div>

                                                    <div
                                                      style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'flex-end',
                                                        gap: 3,
                                                      }}
                                                    >
                                                      {!variant.isDefault && (
                                                        <button
                                                          type="button"
                                                          disabled={
                                                            unitDisabled || isSaving || isDeleting
                                                          }
                                                          onClick={() =>
                                                            void handleMakeVariantDefault(
                                                              unit.id,
                                                              variant.id,
                                                            )
                                                          }
                                                          style={{
                                                            padding: '2px 7px',
                                                            borderRadius: 999,
                                                            border: '1px solid rgba(34,197,94,0.5)',
                                                            background: 'rgba(34,197,94,0.08)',
                                                            fontSize: 10,
                                                            cursor:
                                                              unitDisabled || isSaving || isDeleting
                                                                ? 'default'
                                                                : 'pointer',
                                                            opacity:
                                                              unitDisabled || isSaving || isDeleting
                                                                ? 0.7
                                                                : 1,
                                                          }}
                                                        >
                                                          {isSaving ? '...' : 'Сделать default'}
                                                        </button>
                                                      )}

                                                      <button
                                                        type="button"
                                                        disabled={
                                                          unitDisabled || isSaving || isDeleting
                                                        }
                                                        onClick={() =>
                                                          void handleDeleteVariant(
                                                            unit.id,
                                                            variant.id,
                                                          )
                                                        }
                                                        style={{
                                                          padding: '2px 7px',
                                                          borderRadius: 999,
                                                          border: '1px solid rgba(239,68,68,0.45)',
                                                          background: 'rgba(239,68,68,0.08)',
                                                          fontSize: 10,
                                                          cursor:
                                                            unitDisabled || isSaving || isDeleting
                                                              ? 'default'
                                                              : 'pointer',
                                                          opacity:
                                                            unitDisabled || isSaving || isDeleting
                                                              ? 0.7
                                                              : 1,
                                                        }}
                                                      >
                                                        {isDeleting ? '...' : 'Удалить'}
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                          <div
                                            style={{
                                              display: 'grid',
                                              gridTemplateColumns:
                                                'minmax(0,1fr) minmax(0,0.8fr) minmax(0,0.6fr) minmax(0,0.6fr)',
                                              gap: 6,
                                              alignItems: 'end',
                                            }}
                                          >
                                            <label style={{ fontSize: 11 }}>
                                              Название
                                              <input
                                                type="text"
                                                value={variantsState.form.name}
                                                onChange={(e) =>
                                                  updateVariantsFormField(
                                                    unit.id,
                                                    'name',
                                                    e.target.value,
                                                  )
                                                }
                                                style={{
                                                  width: '100%',
                                                  marginTop: 2,
                                                  padding: '5px 7px',
                                                  borderRadius: 8,
                                                  border:
                                                    '1px solid rgba(148,163,184,0.45)',
                                                  fontSize: 11,
                                                }}
                                              />
                                            </label>

                                            <label style={{ fontSize: 11 }}>
                                              Код
                                              <input
                                                type="text"
                                                value={variantsState.form.code}
                                                onChange={(e) =>
                                                  updateVariantsFormField(
                                                    unit.id,
                                                    'code',
                                                    e.target.value,
                                                  )
                                                }
                                                style={{
                                                  width: '100%',
                                                  marginTop: 2,
                                                  padding: '5px 7px',
                                                  borderRadius: 8,
                                                  border:
                                                    '1px solid rgba(148,163,184,0.45)',
                                                  fontSize: 11,
                                                }}
                                              />
                                            </label>

                                            <label style={{ fontSize: 11 }}>
                                              Площадь
                                              <input
                                                type="text"
                                                value={variantsState.form.area}
                                                onChange={(e) =>
                                                  updateVariantsFormField(
                                                    unit.id,
                                                    'area',
                                                    e.target.value,
                                                  )
                                                }
                                                style={{
                                                  width: '100%',
                                                  marginTop: 2,
                                                  padding: '5px 7px',
                                                  borderRadius: 8,
                                                  border:
                                                    '1px solid rgba(148,163,184,0.45)',
                                                  fontSize: 11,
                                                }}
                                              />
                                            </label>

                                            <label style={{ fontSize: 11 }}>
                                              Комнат
                                              <input
                                                type="text"
                                                value={variantsState.form.rooms}
                                                onChange={(e) =>
                                                  updateVariantsFormField(
                                                    unit.id,
                                                    'rooms',
                                                    e.target.value,
                                                  )
                                                }
                                                style={{
                                                  width: '100%',
                                                  marginTop: 2,
                                                  padding: '5px 7px',
                                                  borderRadius: 8,
                                                  border:
                                                    '1px solid rgba(148,163,184,0.45)',
                                                  fontSize: 11,
                                                }}
                                              />
                                            </label>
                                          </div>

                                          <div
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              flexWrap: 'wrap',
                                            }}
                                          >
                                            <input
                                              type="text"
                                              placeholder="URL картинки варианта"
                                              value={variantsState.form.planImageUrl}
                                              onChange={(e) =>
                                                updateVariantsFormField(
                                                  unit.id,
                                                  'planImageUrl',
                                                  e.target.value,
                                                )
                                              }
                                              style={{
                                                flex: '1 1 280px',
                                                padding: '5px 7px',
                                                borderRadius: 8,
                                                border: '1px solid rgba(148,163,184,0.45)',
                                                fontSize: 11,
                                              }}
                                            />

                                            <label
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                fontSize: 11,
                                              }}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={variantsState.form.isDefault}
                                                onChange={(e) =>
                                                  updateVariantsFormField(
                                                    unit.id,
                                                    'isDefault',
                                                    e.target.checked,
                                                  )
                                                }
                                              />
                                              Сделать default
                                            </label>

                                            <button
                                              type="button"
                                              disabled={variantsState.adding}
                                              onClick={() => void handleAddVariant(unit.id)}
                                              style={{
                                                padding: '5px 10px',
                                                borderRadius: 999,
                                                border: 'none',
                                                background: 'rgba(59,130,246,0.15)',
                                                color: '#1d4ed8',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                cursor: variantsState.adding
                                                  ? 'default'
                                                  : 'pointer',
                                                opacity: variantsState.adding ? 0.7 : 1,
                                              }}
                                            >
                                              {variantsState.adding ? 'Добавление...' : 'Добавить'}
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default ThreeDModelsPage;