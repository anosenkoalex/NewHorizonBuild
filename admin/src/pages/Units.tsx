// admin/src/pages/Units.tsx
import React, {
  FormEvent,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  fetchUnits,
  Unit,
  UnitsFilter,
  UnitPlanVariant,
} from '../api/units';
import { fetchProjects, Project } from '../api/projects';
import { createDeal, DealStatus, DealType } from '../api/deals';

// Метаданные по статусам: читаемое название + цвет
const STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
  }
> = {
  FREE: { label: 'Свободен', color: '#22c55e' },
  RESERVED: { label: 'Резерв', color: '#eab308' },
  SOLD: { label: 'Продан', color: '#ef4444' },
  INSTALLMENT: { label: 'Рассрочка', color: '#3b82f6' },
  EQUITY: { label: 'Долевое', color: '#a855f7' },
};

// Человеческие названия типов юнитов
const TYPE_META: Record<string, string> = {
  APARTMENT: 'Квартира',
  COMMERCIAL: 'Коммерция',
  PARKING: 'Паркинг',
};

type SortField = 'price' | 'area' | 'number';

function formatPrice(value: number | string | null): string {
  if (value == null) return '—';

  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? Number(value)
      : Number(value);

  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString('ru-RU')} сом`;
  }

  return String(value);
}

function getDefaultPlanVariant(unit: Unit): UnitPlanVariant | null {
  const variants = unit.planVariants ?? [];
  if (!variants.length) return null;

  return (
    variants.find((variant) => variant.isDefault) ??
    variants.find((variant) => !!variant.planImageUrl) ??
    variants[0] ??
    null
  );
}

function getPrimaryPlanUrl(unit: Unit): string | null {
  const defaultVariant = getDefaultPlanVariant(unit);
  return defaultVariant?.planImageUrl ?? unit.planImageUrl ?? null;
}

function getViewerUrl(unit: Unit): string {
  const params = new URLSearchParams();

  if (unit.projectId) {
    params.set('projectId', String(unit.projectId));
  }

  params.set('unitId', String(unit.id));

  return `/viewer?${params.toString()}`;
}

const Units = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [units, setUnits] = useState<Unit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<UnitsFilter>({});

  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [projectId, setProjectId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Поиск по номеру / ID
  const [searchTerm, setSearchTerm] = useState('');

  // Сортировка
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Фокус для перехода из глобального поиска
  const [focusedUnitId, setFocusedUnitId] = useState<string | null>(
    null,
  );
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>(
    {},
  );

  // Состояние для создания сделки
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [dealType, setDealType] = useState<DealType>('SALE');
  const [dealStatus, setDealStatus] = useState<DealStatus>('ACTIVE');
  const [dealSaving, setDealSaving] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

  // Просмотр планировок
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [plansUnit, setPlansUnit] = useState<Unit | null>(null);
  const [selectedPlanVariantId, setSelectedPlanVariantId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadUnitsAndProjects = async () => {
      setLoading(true);
      setError(null);

      try {
        const [unitsData, projectsData] = await Promise.all([
          fetchUnits(filters),
          fetchProjects(),
        ]);
        setUnits(unitsData);
        setProjects(projectsData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Неизвестная ошибка');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadUnitsAndProjects();
  }, [filters, reloadKey]);

  // Подсветка и скролл к юниту, если пришли с focusUnitId из глобального поиска
  useEffect(() => {
    const state = (location.state as any) || {};
    if (!state.focusUnitId) return;

    const id = String(state.focusUnitId);
    setFocusedUnitId(id);

    const timeoutId = window.setTimeout(() => {
      const row = rowRefs.current[id];
      if (row && typeof row.scrollIntoView === 'function') {
        row.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [location.state, units]);

  const handleApplyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters({
      status: status || undefined,
      type: type || undefined,
      projectId: projectId || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minArea: minArea ? Number(minArea) : undefined,
      maxArea: maxArea ? Number(maxArea) : undefined,
    });
  };

  const handleResetFilters = () => {
    setStatus('');
    setType('');
    setProjectId('');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setSearchTerm('');
    setFilters({});
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const openDealModal = (unit: Unit) => {
    setSelectedUnit(unit);
    setClientName('');
    setClientPhone('');
    setDealType('SALE');
    setDealStatus('ACTIVE');
    setDealError(null);
    setDealModalOpen(true);
  };

  const closeDealModal = () => {
    setDealModalOpen(false);
    setSelectedUnit(null);
    setDealError(null);
  };

  const openPlansModal = (unit: Unit) => {
    const defaultVariant = getDefaultPlanVariant(unit);
    setPlansUnit(unit);
    setSelectedPlanVariantId(defaultVariant?.id ?? null);
    setPlansModalOpen(true);
  };

  const closePlansModal = () => {
    setPlansModalOpen(false);
    setPlansUnit(null);
    setSelectedPlanVariantId(null);
  };

  const handleCreateDeal = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;

    if (!clientName.trim() || !clientPhone.trim()) {
      setDealError('Укажите ФИО и телефон клиента');
      return;
    }

    setDealSaving(true);
    setDealError(null);

    try {
      const createdDeal = await createDeal({
        unitId: selectedUnit.id,
        clientFullName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        type: dealType,
        status: dealStatus,
      });

      setReloadKey((k) => k + 1);
      closeDealModal();

      navigate(`/deals/${createdDeal.id}`, {
        state: {
          dealId: createdDeal.id,
          deal: createdDeal,
        },
      });
    } catch (err: any) {
      console.error(err);
      setDealError(err?.message || 'Не удалось создать сделку');
    } finally {
      setDealSaving(false);
    }
  };

  const getProjectName = (id: string | null) =>
    projects.find((p) => p.id === id)?.name ?? id ?? '—';

  const sortedUnits = useMemo(() => {
    let base = units;

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      base = units.filter((u) => {
        const numStr = (u.number ?? '').toString().toLowerCase();
        const idStr = String(u.id).toLowerCase();
        const projectStr = String(u.projectId ?? '').toLowerCase();
        return (
          numStr.includes(q) ||
          idStr.includes(q) ||
          projectStr.includes(q)
        );
      });
    }

    if (!sortField) {
      return base;
    }

    const arr = [...base];

    arr.sort((a, b) => {
      let av: number | string | null = null;
      let bv: number | string | null = null;

      if (sortField === 'price') {
        av =
          a.price == null
            ? null
            : typeof a.price === 'number'
            ? a.price
            : Number(a.price);
        bv =
          b.price == null
            ? null
            : typeof b.price === 'number'
            ? b.price
            : Number(b.price);
      } else if (sortField === 'area') {
        av = a.area ?? null;
        bv = b.area ?? null;
      } else if (sortField === 'number') {
        av = (a.number ?? '').toString();
        bv = (b.number ?? '').toString();
      }

      if (av === bv) return 0;
      if (av == null || (typeof av === 'number' && Number.isNaN(av))) return 1;
      if (bv == null || (typeof bv === 'number' && Number.isNaN(bv))) return -1;

      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDirection === 'asc' ? av - bv : bv - av;
      }

      const aStr = String(av);
      const bStr = String(bv);
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr, 'ru')
        : bStr.localeCompare(aStr, 'ru');
    });

    return arr;
  }, [units, searchTerm, sortField, sortDirection]);

  const statusCounts = sortedUnits.reduce<Record<string, number>>(
    (acc, unit) => {
      acc[unit.status] = (acc[unit.status] || 0) + 1;
      return acc;
    },
    {},
  );

  const totalUnits = sortedUnits.length;

  const selectedPlanVariant = useMemo(() => {
    if (!plansUnit) return null;

    const variants = plansUnit.planVariants ?? [];
    if (!variants.length) return null;

    return (
      variants.find((variant) => variant.id === selectedPlanVariantId) ??
      getDefaultPlanVariant(plansUnit)
    );
  }, [plansUnit, selectedPlanVariantId]);

  const selectedPlanImageUrl = useMemo(() => {
    if (!plansUnit) return null;

    return (
      selectedPlanVariant?.planImageUrl ??
      plansUnit.planImageUrl ??
      null
    );
  }, [plansUnit, selectedPlanVariant]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <span
          style={{
            marginLeft: 4,
            opacity: 0.35,
            fontSize: 11,
          }}
        >
          ⇅
        </span>
      );
    }

    return (
      <span
        style={{
          marginLeft: 4,
          fontSize: 11,
        }}
      >
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 24, color: 'var(--nh-text-main)' }}>
        Загрузка...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: 'var(--nh-text-main)' }}>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>Список объектов</h1>
        <div style={{ color: 'var(--nh-danger)' }}>Ошибка: {error}</div>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    padding: '0 24px 32px',
    maxWidth: 1280,
    margin: '0 auto',
    color: 'var(--nh-text-main)',
  };

  const sectionCard: React.CSSProperties = {
    borderRadius: 16,
    background:
      'radial-gradient(circle at top left, var(--nh-accent-soft), transparent 55%), var(--nh-bg-elevated)',
    color: 'var(--nh-text-main)',
    padding: 18,
    boxShadow: '0 14px 32px rgba(15,23,42,0.35)',
    marginBottom: 18,
    border: '1px solid var(--nh-border-subtle)',
  };

  const inputBase: React.CSSProperties = {
    padding: '6px 8px',
    borderRadius: 999,
    border: '1px solid var(--nh-border-subtle)',
    backgroundColor: 'var(--nh-bg-main)',
    color: 'var(--nh-text-main)',
    fontSize: 13,
    outline: 'none',
  };

  const selectBase: React.CSSProperties = {
    ...inputBase,
    paddingRight: 24,
    borderRadius: 999,
  };

  return (
    <div style={containerStyle}>
      <header style={{ margin: '4px 0 16px' }}>
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            opacity: 0.6,
            color: 'var(--nh-text-muted)',
          }}
        >
          Объекты и юниты
        </div>
        <h1
          style={{
            margin: '4px 0 4px',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Реестр всех объектов
        </h1>
        <div
          style={{
            fontSize: 13,
            opacity: 0.75,
            color: 'var(--nh-text-muted)',
          }}
        >
          Всего юнитов в выборке: {totalUnits}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 10,
          }}
        >
          {Object.entries(STATUS_META).map(([key, meta]) => {
            const count = statusCounts[key] || 0;
            if (!count) return null;

            return (
              <div
                key={key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(15,23,42,0.02)',
                  border: '1px solid rgba(148,163,184,0.35)',
                  fontSize: 12,
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: meta.color,
                    boxShadow: '0 0 0 2px rgba(15,23,42,0.2)',
                  }}
                />
                <span style={{ color: 'var(--nh-text-main)' }}>
                  {meta.label}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: 'var(--nh-text-main)',
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      <section style={sectionCard}>
        <form
          onSubmit={handleApplyFilters}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          <div style={{ minWidth: 160 }}>
            <label style={{ fontSize: 12, color: 'var(--nh-text-muted)' }}>
              Статус
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  ...selectBase,
                  display: 'block',
                  width: '100%',
                  marginTop: 4,
                }}
              >
                <option value="">Все</option>
                <option value="FREE">Свободен</option>
                <option value="RESERVED">Резерв</option>
                <option value="SOLD">Продан</option>
                <option value="INSTALLMENT">Рассрочка</option>
                <option value="EQUITY">Долевое</option>
              </select>
            </label>
          </div>

          <div style={{ minWidth: 160 }}>
            <label style={{ fontSize: 12, color: 'var(--nh-text-muted)' }}>
              Тип
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  ...selectBase,
                  display: 'block',
                  width: '100%',
                  marginTop: 4,
                }}
              >
                <option value="">Все</option>
                <option value="APARTMENT">Квартира</option>
                <option value="COMMERCIAL">Коммерция</option>
                <option value="PARKING">Паркинг</option>
              </select>
            </label>
          </div>

          <div style={{ minWidth: 200 }}>
            <label style={{ fontSize: 12, color: 'var(--nh-text-muted)' }}>
              Проект
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                style={{
                  ...selectBase,
                  display: 'block',
                  width: '100%',
                  marginTop: 4,
                }}
              >
                <option value="">Все</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--nh-text-muted)' }}>
              Мин. цена, сом
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                style={{
                  ...inputBase,
                  display: 'block',
                  width: 130,
                  marginTop: 4,
                }}
              />
            </label>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--nh-text-muted)' }}>
              Макс. цена, сом
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{
                  ...inputBase,
                  display: 'block',
                  width: 130,
                  marginTop: 4,
                }}
              />
            </label>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--nh-text-muted)' }}>
              Мин. площадь, м²
              <input
                type="number"
                value={minArea}
                onChange={(e) => setMinArea(e.target.value)}
                style={{
                  ...inputBase,
                  display: 'block',
                  width: 130,
                  marginTop: 4,
                }}
              />
            </label>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--nh-text-muted)' }}>
              Макс. площадь, м²
              <input
                type="number"
                value={maxArea}
                onChange={(e) => setMaxArea(e.target.value)}
                style={{
                  ...inputBase,
                  display: 'block',
                  width: 130,
                  marginTop: 4,
                }}
              />
            </label>
          </div>

          <div style={{ minWidth: 200, flexGrow: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--nh-text-muted)' }}>
              Поиск по номеру / ID
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  ...inputBase,
                  display: 'block',
                  width: '100%',
                  marginTop: 4,
                }}
                placeholder="Например, 45 или 2134"
              />
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <button
              type="submit"
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--nh-accent)',
                color: '#f9fafb',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Применить фильтры
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                border: '1px solid var(--nh-border-subtle)',
                background: 'transparent',
                color: 'var(--nh-text-main)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Сбросить
            </button>
          </div>
        </form>
      </section>

      <section style={sectionCard}>
        <div
          style={{
            fontSize: 13,
            marginBottom: 8,
            color: 'var(--nh-text-muted)',
          }}
        >
          Результаты подбора объектов
        </div>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 980,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th
                  style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('number')}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Номер
                    {renderSortIcon('number')}
                  </span>
                </th>
                <th style={thStyle}>Тип</th>
                <th style={thStyle}>Проект</th>
                <th style={thStyle}>Статус</th>
                <th
                  style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('area')}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Площадь, м²
                    {renderSortIcon('area')}
                  </span>
                </th>
                <th
                  style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('price')}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Цена, сом
                    {renderSortIcon('price')}
                  </span>
                </th>
                <th style={thStyle}>Планировка</th>
                <th style={thStyle}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedUnits.map((unit) => {
                const meta =
                  STATUS_META[unit.status] ??
                  ({
                    label: unit.status,
                    color: '#6b7280',
                  } as const);

                const areaText =
                  unit.area != null ? `${unit.area} м²` : '—';

                const priceText = formatPrice(unit.price);
                const typeLabel = TYPE_META[unit.type] ?? unit.type;
                const defaultPlanVariant = getDefaultPlanVariant(unit);
                const primaryPlanUrl = getPrimaryPlanUrl(unit);
                const variantsCount = unit.planVariants?.length ?? 0;
                const hasAnyPlan = Boolean(primaryPlanUrl || variantsCount > 0);

                return (
                  <tr
                    key={unit.id}
                    ref={(el) => {
                      rowRefs.current[String(unit.id)] = el;
                    }}
                    style={{
                      backgroundColor:
                        String(unit.id) === focusedUnitId
                          ? 'rgba(56,189,248,0.14)'
                          : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={tdStyle}>{unit.id}</td>
                    <td style={tdStyle}>{unit.number ?? '-'}</td>
                    <td style={tdStyle}>{typeLabel}</td>
                    <td style={tdStyle}>{getProjectName(unit.projectId)}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 500,
                          backgroundColor: meta.color,
                          color: '#ffffff',
                        }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td style={tdStyle}>{areaText}</td>
                    <td style={tdStyle}>{priceText}</td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          alignItems: 'flex-start',
                        }}
                      >
                        {primaryPlanUrl ? (
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--nh-text-main)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span role="img" aria-label="plan">
                              📐
                            </span>
                            <span>
                              {defaultPlanVariant?.isDefault
                                ? 'Есть базовая'
                                : 'Есть план'}
                            </span>
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--nh-text-muted)',
                            }}
                          >
                            Нет файла
                          </span>
                        )}

                        {variantsCount > 0 && (
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--nh-text-muted)',
                            }}
                          >
                            Вариантов: {variantsCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => navigate(getViewerUrl(unit))}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 999,
                            border: '1px solid var(--nh-accent)',
                            background: 'transparent',
                            color: 'var(--nh-accent)',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          Открыть в 3D
                        </button>

                        {hasAnyPlan && (
                          <button
                            type="button"
                            onClick={() => openPlansModal(unit)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 999,
                              border: '1px solid var(--nh-border-subtle)',
                              background: 'transparent',
                              color: 'var(--nh-text-main)',
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            Планировка
                          </button>
                        )}

                        {(unit.status === 'FREE' ||
                          unit.status === 'RESERVED') && (
                          <button
                            type="button"
                            onClick={() => openDealModal(unit)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 999,
                              border: 'none',
                              background: '#16a34a',
                              color: '#fff',
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            Создать сделку
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedUnits.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      ...tdStyle,
                      textAlign: 'center',
                      padding: '20px 10px',
                      color: 'var(--nh-text-muted)',
                    }}
                  >
                    По текущим фильтрам ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {dealModalOpen && selectedUnit && (
        <div style={backdropStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 12 }}>
              Новая сделка по объекту {selectedUnit.number || selectedUnit.id}
            </h2>

            {dealError && (
              <div
                style={{
                  marginBottom: 8,
                  color: 'var(--nh-danger)',
                  fontSize: 13,
                }}
              >
                {dealError}
              </div>
            )}

            <form onSubmit={handleCreateDeal}>
              <div style={{ marginBottom: 8 }}>
                <label
                  style={{
                    fontSize: 13,
                    display: 'block',
                    marginBottom: 4,
                    color: 'var(--nh-text-muted)',
                  }}
                >
                  ФИО клиента
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={modalInputStyle}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label
                  style={{
                    fontSize: 13,
                    display: 'block',
                    marginBottom: 4,
                    color: 'var(--nh-text-muted)',
                  }}
                >
                  Телефон клиента
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  style={modalInputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontSize: 13,
                      display: 'block',
                      marginBottom: 4,
                      color: 'var(--nh-text-muted)',
                    }}
                  >
                    Тип сделки
                  </label>
                  <select
                    value={dealType}
                    onChange={(e) =>
                      setDealType(e.target.value as DealType)
                    }
                    style={modalInputStyle}
                  >
                    <option value="SALE">Продажа</option>
                    <option value="INSTALLMENT">Рассрочка</option>
                    <option value="EQUITY">Долевое участие</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontSize: 13,
                      display: 'block',
                      marginBottom: 4,
                      color: 'var(--nh-text-muted)',
                    }}
                  >
                    Статус
                  </label>
                  <select
                    value={dealStatus}
                    onChange={(e) =>
                      setDealStatus(e.target.value as DealStatus)
                    }
                    style={modalInputStyle}
                  >
                    <option value="DRAFT">Черновик</option>
                    <option value="ACTIVE">Активна</option>
                    <option value="COMPLETED">Завершена</option>
                    <option value="CANCELED">Отменена</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.18)',
                  fontSize: 12,
                  color: 'var(--nh-text-muted)',
                  marginBottom: 12,
                }}
              >
                Ответственным менеджером по сделке будет текущий авторизованный пользователь.
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={closeDealModal}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid var(--nh-border-subtle)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--nh-text-main)',
                  }}
                  disabled={dealSaving}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={dealSaving}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#16a34a',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {dealSaving ? 'Создание...' : 'Создать сделку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {plansModalOpen && plansUnit && (
        <div style={backdropStyle}>
          <div
            style={{
              ...modalStyle,
              maxWidth: 900,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'flex-start',
                marginBottom: 14,
              }}
            >
              <div>
                <h2 style={{ marginBottom: 6 }}>
                  Планировка объекта {plansUnit.number || plansUnit.id}
                </h2>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--nh-text-muted)',
                  }}
                >
                  {TYPE_META[plansUnit.type] ?? plansUnit.type} ·{' '}
                  {getProjectName(plansUnit.projectId)}
                </div>
              </div>

              <button
                type="button"
                onClick={closePlansModal}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--nh-border-subtle)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--nh-text-main)',
                }}
              >
                Закрыть
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '280px 1fr',
                gap: 16,
              }}
            >
              <div
                style={{
                  border: '1px solid var(--nh-border-subtle)',
                  borderRadius: 14,
                  padding: 12,
                  background: 'var(--nh-bg-main)',
                  maxHeight: 520,
                  overflowY: 'auto',
                }}
              >
                {plansUnit.planImageUrl && (
                  <button
                    type="button"
                    onClick={() => setSelectedPlanVariantId(null)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border:
                        selectedPlanVariantId === null
                          ? '1px solid var(--nh-accent)'
                          : '1px solid var(--nh-border-subtle)',
                      background:
                        selectedPlanVariantId === null
                          ? 'rgba(59,130,246,0.10)'
                          : 'transparent',
                      marginBottom:
                        (plansUnit.planVariants?.length ?? 0) > 0 ? 8 : 0,
                      cursor: 'pointer',
                      color: 'var(--nh-text-main)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      Базовая планировка
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--nh-text-muted)',
                        marginTop: 2,
                      }}
                    >
                      Основное изображение юнита
                    </div>
                  </button>
                )}

                {(plansUnit.planVariants ?? []).length > 0 ? (
                  (plansUnit.planVariants ?? []).map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedPlanVariantId(variant.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: 12,
                        border:
                          selectedPlanVariantId === variant.id
                            ? '1px solid var(--nh-accent)'
                            : '1px solid var(--nh-border-subtle)',
                        background:
                          selectedPlanVariantId === variant.id
                            ? 'rgba(59,130,246,0.10)'
                            : 'transparent',
                        marginBottom: 8,
                        cursor: 'pointer',
                        color: 'var(--nh-text-main)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {variant.name}
                        </div>
                        {variant.isDefault && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: 'rgba(34,197,94,0.16)',
                              color: '#166534',
                              fontWeight: 700,
                            }}
                          >
                            DEFAULT
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--nh-text-muted)',
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}
                      >
                        {[
                          variant.code,
                          variant.rooms != null
                            ? `${variant.rooms} комн.`
                            : null,
                          variant.area != null ? `${variant.area} м²` : null,
                        ]
                          .filter(Boolean)
                          .join(' • ') || 'Без доп. параметров'}
                      </div>
                    </button>
                  ))
                ) : !plansUnit.planImageUrl ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--nh-text-muted)',
                    }}
                  >
                    Для этого юнита пока нет загруженных планировок.
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  border: '1px solid var(--nh-border-subtle)',
                  borderRadius: 14,
                  padding: 12,
                  background: 'var(--nh-bg-main)',
                  minHeight: 360,
                }}
              >
                <div
                  style={{
                    marginBottom: 10,
                    fontSize: 13,
                    color: 'var(--nh-text-muted)',
                  }}
                >
                  {selectedPlanVariant
                    ? `Выбран вариант: ${selectedPlanVariant.name}`
                    : plansUnit.planImageUrl
                    ? 'Базовая планировка'
                    : 'Предпросмотр'}
                </div>

                {selectedPlanImageUrl ? (
                  <div>
                    <div
                      style={{
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '1px solid var(--nh-border-subtle)',
                        background: '#fff',
                      }}
                    >
                      <img
                        src={selectedPlanImageUrl}
                        alt={`Планировка ${plansUnit.number ?? plansUnit.id}`}
                        style={{
                          width: '100%',
                          maxHeight: 520,
                          objectFit: 'contain',
                          display: 'block',
                          background: '#fff',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginTop: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--nh-text-muted)',
                          lineHeight: 1.5,
                        }}
                      >
                        {selectedPlanVariant?.description || 'Описание не указано'}
                      </div>

                      <a
                        href={selectedPlanImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '6px 12px',
                          borderRadius: 999,
                          border: '1px solid var(--nh-accent)',
                          color: 'var(--nh-accent)',
                          textDecoration: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Открыть оригинал
                      </a>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      minHeight: 260,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--nh-text-muted)',
                      fontSize: 13,
                    }}
                  >
                    Нет изображения для предпросмотра
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid var(--nh-border-subtle)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--nh-text-muted)',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid rgba(148,163,184,0.18)',
  fontSize: 13,
  color: 'var(--nh-text-main)',
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 40,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  background: 'var(--nh-bg-elevated)',
  borderRadius: 16,
  padding: 20,
  width: '100%',
  maxWidth: 420,
  boxShadow: '0 25px 50px -12px rgba(15,23,42,0.7)',
  border: '1px solid var(--nh-border-subtle)',
  color: 'var(--nh-text-main)',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 10,
  border: '1px solid var(--nh-border-subtle)',
  fontSize: 13,
  backgroundColor: 'var(--nh-bg-main)',
  color: 'var(--nh-text-main)',
};

export default Units;