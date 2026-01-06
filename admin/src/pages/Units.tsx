// admin/src/pages/Units.tsx
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUnits, Unit, UnitsFilter } from '../api/units';
import { fetchProjects, Project } from '../api/projects';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// тот же ключ, что и в AuthContext
const STORAGE_TOKEN_KEY = 'accessToken';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Метаданные по статусам: читаемое название + цвет
const STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
  }
> = {
  FREE: { label: 'Свободен', color: '#22c55e' }, // зелёный
  RESERVED: { label: 'Резерв', color: '#eab308' }, // жёлтый
  SOLD: { label: 'Продан', color: '#ef4444' }, // красный
  INSTALLMENT: { label: 'Рассрочка', color: '#3b82f6' }, // синий
  EQUITY: { label: 'Долевое', color: '#a855f7' }, // фиолетовый
};

const Units = () => {
  const navigate = useNavigate();

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

  // Состояние для создания сделки
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [dealType, setDealType] = useState<'SALE' | 'INSTALLMENT' | 'EQUITY'>(
    'SALE',
  );
  const [dealStatus, setDealStatus] = useState<
    'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELED'
  >('COMPLETED');
  const [dealSaving, setDealSaving] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

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

  const openDealModal = (unit: Unit) => {
    setSelectedUnit(unit);
    setClientName('');
    setClientPhone('');
    setDealType('SALE');
    setDealStatus('COMPLETED');
    setDealError(null);
    setDealModalOpen(true);
  };

  const closeDealModal = () => {
    setDealModalOpen(false);
    setSelectedUnit(null);
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
      const res = await fetch(`${API_URL}/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          unitId: selectedUnit.id,
          clientFullName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          type: dealType,
          status: dealStatus,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Ошибка создания сделки (${res.status}): ${text || 'unknown'}`,
        );
      }

      // обновляем список юнитов (статус FREE/RESERVED -> SOLD/…)
      setReloadKey((k) => k + 1);
      closeDealModal();
    } catch (err: any) {
      console.error(err);
      setDealError(err.message || 'Не удалось создать сделку');
    } finally {
      setDealSaving(false);
    }
  };

  const getProjectName = (id: string) =>
    projects.find((p) => p.id === id)?.name ?? id;

  if (loading) {
    return <div style={{ padding: 24 }}>Загрузка...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Список объектов (Units)</h1>
        <div style={{ color: 'red' }}>Ошибка: {error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>
        Список объектов (Units)
      </h1>

      <form
        onSubmit={handleApplyFilters}
        style={{
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <label style={{ fontSize: 13 }}>
            Статус:
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ marginLeft: 4 }}
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

        <div>
          <label style={{ fontSize: 13 }}>
            Тип:
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ marginLeft: 4 }}
            >
              <option value="">Все</option>
              <option value="APARTMENT">Квартира</option>
              <option value="COMMERCIAL">Коммерция</option>
              <option value="PARKING">Паркинг</option>
            </select>
          </label>
        </div>

        <div>
          <label style={{ fontSize: 13 }}>
            Проект:
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ marginLeft: 4, minWidth: 160 }}
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
          <label style={{ fontSize: 13 }}>
            Мин. цена, сом:
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              style={{ marginLeft: 4, width: 120 }}
            />
          </label>
        </div>
        <div>
          <label style={{ fontSize: 13 }}>
            Макс. цена, сом:
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={{ marginLeft: 4, width: 120 }}
            />
          </label>
        </div>
        <div>
          <label style={{ fontSize: 13 }}>
            Мин. площадь, м²:
            <input
              type="number"
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
              style={{ marginLeft: 4, width: 120 }}
            />
          </label>
        </div>
        <div>
          <label style={{ fontSize: 13 }}>
            Макс. площадь, м²:
            <input
              type="number"
              value={maxArea}
              onChange={(e) => setMaxArea(e.target.value)}
              style={{ marginLeft: 4, width: 120 }}
            />
          </label>
        </div>
        <button type="submit" style={{ padding: '4px 12px', fontSize: 13 }}>
          Применить
        </button>
      </form>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: 900,
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Номер</th>
            <th style={thStyle}>Тип</th>
            <th style={thStyle}>Проект</th>
            <th style={thStyle}>Статус</th>
            <th style={thStyle}>Площадь, м²</th>
            <th style={thStyle}>Цена, сом</th>
            <th style={thStyle}>Планировка</th>
            <th style={thStyle}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => {
            const meta =
              STATUS_META[unit.status] ??
              ({
                label: unit.status,
                color: '#6b7280',
              } as const);

            const areaText =
              unit.area != null ? `${unit.area} м²` : '—';

            const priceText =
              unit.price != null
                ? `${unit.price.toLocaleString('ru-RU')} сом`
                : '—';

            return (
              <tr key={unit.id}>
                <td style={tdStyle}>{unit.id}</td>
                <td style={tdStyle}>{unit.number ?? '-'}</td>
                <td style={tdStyle}>{unit.type}</td>
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
                  {unit.planImageUrl ? (
                    <a
                      href={unit.planImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 12,
                        color: '#2563eb',
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span role="img" aria-label="plan">
                        📐
                      </span>
                      <span>Планировка</span>
                    </a>
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        color: '#9ca3af',
                      }}
                    >
                      Нет
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/viewer?projectId=${unit.projectId}&unitId=${unit.id}`,
                        )
                      }
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid #2563eb',
                        background: '#ffffff',
                        color: '#2563eb',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Открыть в 3D
                    </button>

                    {(unit.status === 'FREE' ||
                      unit.status === 'RESERVED') && (
                      <button
                        type="button"
                        onClick={() => openDealModal(unit)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
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
        </tbody>
      </table>

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
                  color: 'red',
                  fontSize: 13,
                }}
              >
                {dealError}
              </div>
            )}

            <form onSubmit={handleCreateDeal}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 13, display: 'block' }}>
                  ФИО клиента
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 13, display: 'block' }}>
                  Телефон клиента
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div
                style={{ display: 'flex', gap: 12, marginBottom: 12 }}
              >
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, display: 'block' }}>
                    Тип сделки
                  </label>
                  <select
                    value={dealType}
                    onChange={(e) =>
                      setDealType(
                        e.target.value as
                          | 'SALE'
                          | 'INSTALLMENT'
                          | 'EQUITY',
                      )
                    }
                    style={inputStyle}
                  >
                    <option value="SALE">Продажа</option>
                    <option value="INSTALLMENT">Рассрочка</option>
                    <option value="EQUITY">Долевое участие</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, display: 'block' }}>
                    Статус
                  </label>
                  <select
                    value={dealStatus}
                    onChange={(e) =>
                      setDealStatus(
                        e.target.value as
                          | 'DRAFT'
                          | 'ACTIVE'
                          | 'COMPLETED'
                          | 'CANCELED',
                      )
                    }
                    style={inputStyle}
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
                    borderRadius: 4,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
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
                    borderRadius: 4,
                    border: 'none',
                    background: '#16a34a',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {dealSaving ? 'Создание...' : 'Создать сделку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 13,
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid #f3f4f6',
  fontSize: 13,
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 40,
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  width: '100%',
  maxWidth: 420,
  boxShadow: '0 25px 50px -12px rgba(15,23,42,0.5)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 13,
};

export default Units;
