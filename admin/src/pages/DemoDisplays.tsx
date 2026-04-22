// admin/src/pages/DemoDisplaysPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  createDemoDisplay,
  deleteDemoDisplay,
  fetchDemoDisplays,
  setDemoEnabledOnDemoDisplay,
  type DemoDisplay,
  updateDemoDisplay,
} from '../api/demoDisplays';

function normalizeText(value: string): string {
  return value.trim();
}

function normalizeNullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Нет данных';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Нет данных';

  return date.toLocaleString('ru-RU');
}

function formatLastPing(value: string | null): string {
  if (!value) return 'Телевизор ещё не подключался';
  return `Последний пинг: ${formatDateTime(value)}`;
}

function formatViewerActivity(value: string | null): string {
  if (!value) return 'Viewer ещё не активировался';
  return `Последняя активность viewer: ${formatDateTime(value)}`;
}

function shortenId(value: string | null): string {
  if (!value) return 'Не назначен';
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function isDisplayOnline(lastPingAt: string | null): boolean {
  if (!lastPingAt) return false;

  const time = new Date(lastPingAt).getTime();
  if (Number.isNaN(time)) return false;

  return Date.now() - time < 70_000;
}

function getDisplayModeMeta(display: DemoDisplay): {
  label: string;
  color: string;
  background: string;
} {
  if (!display.isActive) {
    return {
      label: 'Экран выключен',
      color: '#94a3b8',
      background: 'rgba(148,163,184,0.12)',
    };
  }

  if (!display.demoEnabled) {
    return {
      label: 'Demo mode выключен',
      color: '#f59e0b',
      background: 'rgba(245,158,11,0.12)',
    };
  }

  if (display.currentUnitId) {
    return {
      label: 'Live · выбран объект',
      color: '#22c55e',
      background: 'rgba(34,197,94,0.12)',
    };
  }

  if (display.currentProjectId) {
    return {
      label: 'Live · выбран проект',
      color: '#22c55e',
      background: 'rgba(34,197,94,0.12)',
    };
  }

  if (display.autoplayEnabled) {
    return {
      label: `Автодемо · ${display.autoplayDelaySec ?? 15} сек`,
      color: '#60a5fa',
      background: 'rgba(96,165,250,0.12)',
    };
  }

  return {
    label: 'Idle / ожидание',
    color: '#eab308',
    background: 'rgba(234,179,8,0.12)',
  };
}

function getDemoModeLabel(display: DemoDisplay): string {
  if (!display.demoEnabled) {
    return 'Demo mode выключен';
  }

  if (display.presenterUserId) {
    return 'Demo mode включён';
  }

  return 'Demo mode включён, но сотрудник не привязан';
}

function compareDisplays(a: DemoDisplay, b: DemoDisplay): number {
  const aActive = a.isActive ? 0 : 1;
  const bActive = b.isActive ? 0 : 1;
  if (aActive !== bActive) return aActive - bActive;

  const aDemo = a.demoEnabled ? 0 : 1;
  const bDemo = b.demoEnabled ? 0 : 1;
  if (aDemo !== bDemo) return aDemo - bDemo;

  const aOnline = isDisplayOnline(a.lastPingAt) ? 0 : 1;
  const bOnline = isDisplayOnline(b.lastPingAt) ? 0 : 1;
  if (aOnline !== bOnline) return aOnline - bOnline;

  const aOffice = (a.office ?? '').toLowerCase();
  const bOffice = (b.office ?? '').toLowerCase();
  if (aOffice !== bOffice) return aOffice.localeCompare(bOffice);

  return (a.name ?? '')
    .toLowerCase()
    .localeCompare((b.name ?? '').toLowerCase());
}

const DemoDisplaysPage: React.FC = () => {
  const [items, setItems] = useState<DemoDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [office, setOffice] = useState('');
  const [creating, setCreating] = useState(false);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async (
    signal?: AbortSignal,
    options?: { silent?: boolean },
  ) => {
    const silent = options?.silent ?? false;

    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const list = await fetchDemoDisplays();

      if (signal?.aborted) return;

      setItems(list);
      setError(null);
    } catch (e: any) {
      if (signal?.aborted) return;

      const isAbortError =
        e?.name === 'AbortError' ||
        String(e?.message ?? '').toLowerCase().includes('abort');

      if (isAbortError) return;

      console.error(e);
      setError(e?.message ?? 'Не удалось загрузить демо-экраны');
    } finally {
      if (signal?.aborted) return;

      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();

    void load(ctrl.signal);

    const id = window.setInterval(() => {
      void load(ctrl.signal, { silent: true });
    }, 5000);

    return () => {
      ctrl.abort();
      window.clearInterval(id);
    };
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort(compareDisplays);
  }, [items]);

  const summary = useMemo(() => {
    const total = items.length;
    const active = items.filter((item) => item.isActive).length;
    const demoEnabled = items.filter((item) => item.demoEnabled).length;
    const live = items.filter(
      (item) => !!(item.currentProjectId || item.currentUnitId),
    ).length;
    const autoplay = items.filter((item) => item.autoplayEnabled).length;

    return {
      total,
      active,
      demoEnabled,
      live,
      autoplay,
    };
  }, [items]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const handleCreate = async () => {
    const normalizedName = normalizeText(name);
    const normalizedOffice = normalizeNullableText(office);

    if (!normalizedName) {
      showToast('Введите название экрана');
      return;
    }

    try {
      setCreating(true);

      const created = await createDemoDisplay({
        name: normalizedName,
        office: normalizedOffice,
      });

      setName('');
      setOffice('');

      await load();

      const link = `${window.location.origin}/demo/${created.code}`;
      try {
        await navigator.clipboard.writeText(link);
        showToast('Экран создан, ссылка скопирована');
      } catch {
        showToast('Экран создан');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message ?? 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (d: DemoDisplay) => {
    try {
      setSavingId(d.id);

      const updated = await updateDemoDisplay(d.id, {
        isActive: !d.isActive,
      });

      setItems((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
      showToast(updated.isActive ? 'Экран активирован' : 'Экран выключен');
    } catch (e: any) {
      console.error(e);
      showToast(e?.message ?? 'Ошибка обновления');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleDemoMode = async (d: DemoDisplay) => {
    try {
      setSavingId(d.id);

      const updated = await setDemoEnabledOnDemoDisplay(d.id, {
        enabled: !d.demoEnabled,
      });

      setItems((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
      showToast(updated.demoEnabled ? 'Demo mode включён' : 'Demo mode выключен');
    } catch (e: any) {
      console.error(e);
      showToast(e?.message ?? 'Ошибка переключения demo mode');
    } finally {
      setSavingId(null);
    }
  };

  const handleResetLiveState = async (d: DemoDisplay) => {
    try {
      setSavingId(d.id);

      const updated = await updateDemoDisplay(d.id, {
        currentProjectId: null,
        currentUnitId: null,
        autoplayEnabled: false,
      });

      setItems((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
      showToast('Live-состояние сброшено');
    } catch (e: any) {
      console.error(e);
      showToast(e?.message ?? 'Ошибка сброса live-состояния');
    } finally {
      setSavingId(null);
    }
  };

  const handleRename = async (d: DemoDisplay, nextName: string) => {
    const normalizedName = normalizeText(nextName);

    if (!normalizedName) {
      showToast('Название экрана не может быть пустым');
      return;
    }

    if (normalizedName === d.name) {
      return;
    }

    try {
      setSavingId(d.id);

      const updated = await updateDemoDisplay(d.id, {
        name: normalizedName,
      });

      setItems((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
      showToast('Название сохранено');
    } catch (e: any) {
      console.error(e);
      showToast(e?.message ?? 'Ошибка сохранения');
    } finally {
      setSavingId(null);
    }
  };

  const handleOffice = async (d: DemoDisplay, nextOffice: string) => {
    const normalizedOffice = normalizeNullableText(nextOffice);

    if ((d.office ?? null) === normalizedOffice) {
      return;
    }

    try {
      setSavingId(d.id);

      const updated = await updateDemoDisplay(d.id, {
        office: normalizedOffice,
      });

      setItems((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
      showToast('Офис сохранён');
    } catch (e: any) {
      console.error(e);
      showToast(e?.message ?? 'Ошибка сохранения');
    } finally {
      setSavingId(null);
    }
  };

  const handleCopyLink = async (d: DemoDisplay) => {
    const link = `${window.location.origin}/demo/${d.code}`;

    try {
      await navigator.clipboard.writeText(link);
      showToast('Ссылка скопирована');
    } catch {
      showToast(link);
    }
  };

  const handleDelete = async (d: DemoDisplay) => {
    const confirmed = window.confirm(
      `Удалить экран "${d.name || d.code}"? Это действие нельзя отменить.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingId(d.id);
      await deleteDemoDisplay(d.id);
      setItems((prev) => prev.filter((x) => x.id !== d.id));
      showToast('Экран удалён');
    } catch (e: any) {
      console.error(e);
      showToast(e?.message ?? 'Ошибка удаления');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1180, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.65,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Hidden admin / owner tool
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: 26 }}>
            Служебная панель demo-экранов
          </h1>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
            Это не основной UX для менеджеров. Основной сценарий живёт через
            кнопку <b>TV / Demo</b> в шапке CRM. Здесь — служебный контроль всех
            экранов.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="/demo"
            target="_blank"
            rel="noreferrer"
            style={{
              borderRadius: 12,
              padding: '10px 14px',
              border: '1px solid rgba(96,165,250,0.35)',
              background: 'rgba(30,58,138,0.35)',
              color: '#e5e7eb',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 150,
            }}
          >
            Открыть меню /demo
          </a>

          <button
            type="button"
            onClick={() => void load(undefined)}
            disabled={loading || refreshing}
            style={{
              borderRadius: 12,
              padding: '10px 14px',
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(15,23,42,0.6)',
              color: '#e5e7eb',
              cursor: loading || refreshing ? 'default' : 'pointer',
              minWidth: 120,
              opacity: loading || refreshing ? 0.7 : 1,
            }}
          >
            {refreshing ? 'Обновление…' : 'Обновить'}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
        }}
      >
        {[
          { label: 'Всего экранов', value: summary.total },
          { label: 'Активных', value: summary.active },
          { label: 'Demo включён', value: summary.demoEnabled },
          { label: 'Live-показ', value: summary.live },
          { label: 'Автодемо', value: summary.autoplay },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              borderRadius: 14,
              border: '1px solid rgba(148,163,184,0.25)',
              background: 'rgba(15,23,42,0.45)',
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.65 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 18,
          borderRadius: 16,
          border: '1px solid rgba(148,163,184,0.25)',
          background: 'rgba(15,23,42,0.55)',
          padding: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
          Создать новый экран
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr auto',
            gap: 12,
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название (например: TV Офис 1)"
            style={{
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(2,6,23,0.55)',
              color: '#e5e7eb',
              padding: '10px 12px',
              outline: 'none',
            }}
          />
          <input
            value={office}
            onChange={(e) => setOffice(e.target.value)}
            placeholder="Офис (опционально)"
            style={{
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(2,6,23,0.55)',
              color: '#e5e7eb',
              padding: '10px 12px',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            style={{
              borderRadius: 12,
              padding: '10px 14px',
              border: '1px solid rgba(96,165,250,0.55)',
              background: 'rgba(30,58,138,0.55)',
              color: '#e5e7eb',
              cursor: creating ? 'default' : 'pointer',
              minWidth: 140,
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? 'Создаю…' : 'Создать'}
          </button>
        </div>
      </div>

      {error && <div style={{ marginTop: 14, color: '#fecaca' }}>{error}</div>}

      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div style={{ opacity: 0.8 }}>Загрузка…</div>
        ) : sorted.length === 0 ? (
          <div style={{ opacity: 0.8 }}>
            Пока нет демо-экранов. Создай первый сверху.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 14,
            }}
          >
            {sorted.map((d) => {
              const tvLink = `${window.location.origin}/demo/${d.code}`;
              const busy = savingId === d.id;
              const modeMeta = getDisplayModeMeta(d);
              const online = isDisplayOnline(d.lastPingAt);

              return (
                <div
                  key={d.id}
                  style={{
                    borderRadius: 16,
                    border: d.isActive
                      ? '1px solid rgba(34,197,94,0.55)'
                      : '1px solid rgba(148,163,184,0.25)',
                    background: 'rgba(15,23,42,0.45)',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 800 }}>
                          {d.name || `Экран ${d.code}`}
                        </div>

                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: online ? '#22c55e' : '#64748b',
                            boxShadow: online
                              ? '0 0 0 4px rgba(34,197,94,0.14)'
                              : 'none',
                          }}
                        />
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {d.office || 'Офис не указан'} · Код: <b>{d.code}</b>
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.68, marginTop: 4 }}>
                        {formatLastPing(d.lastPingAt)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleToggleActive(d)}
                      disabled={busy}
                      style={{
                        borderRadius: 999,
                        padding: '8px 12px',
                        border: d.isActive
                          ? '1px solid rgba(239,68,68,0.45)'
                          : '1px solid rgba(34,197,94,0.45)',
                        background: d.isActive
                          ? 'rgba(127,29,29,0.35)'
                          : 'rgba(22,163,74,0.25)',
                        color: '#e5e7eb',
                        cursor: busy ? 'default' : 'pointer',
                        whiteSpace: 'nowrap',
                        opacity: busy ? 0.7 : 1,
                      }}
                    >
                      {d.isActive ? 'Выключить' : 'Активировать'}
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.92,
                      borderRadius: 10,
                      padding: '8px 10px',
                      background: modeMeta.background,
                      border: `1px solid ${modeMeta.color}44`,
                      color: modeMeta.color,
                      fontWeight: 600,
                    }}
                  >
                    Режим: {modeMeta.label}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.85,
                      borderRadius: 10,
                      padding: '8px 10px',
                      background: 'rgba(2,6,23,0.35)',
                      border: '1px solid rgba(148,163,184,0.18)',
                      lineHeight: 1.55,
                    }}
                  >
                    <div>{getDemoModeLabel(d)}</div>
                    <div>Сотрудник: {shortenId(d.presenterUserId)}</div>
                    <div>{formatViewerActivity(d.lastViewerActivityAt)}</div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}
                      >
                        Название
                      </div>
                      <input
                        defaultValue={d.name ?? ''}
                        onBlur={(e) => void handleRename(d, e.target.value)}
                        placeholder="Название"
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.45)',
                          color: '#e5e7eb',
                          padding: '9px 10px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <div
                        style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}
                      >
                        Офис
                      </div>
                      <input
                        defaultValue={d.office ?? ''}
                        onBlur={(e) => void handleOffice(d, e.target.value)}
                        placeholder="Офис"
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.45)',
                          color: '#e5e7eb',
                          padding: '9px 10px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => void handleToggleDemoMode(d)}
                      disabled={busy}
                      style={{
                        borderRadius: 12,
                        padding: '10px 12px',
                        border: d.demoEnabled
                          ? '1px solid rgba(239,68,68,0.45)'
                          : '1px solid rgba(34,197,94,0.45)',
                        background: d.demoEnabled
                          ? 'rgba(127,29,29,0.35)'
                          : 'rgba(22,163,74,0.25)',
                        color: '#e5e7eb',
                        cursor: busy ? 'default' : 'pointer',
                        flex: '1 1 auto',
                        minWidth: 150,
                        opacity: busy ? 0.7 : 1,
                      }}
                    >
                      {d.demoEnabled ? 'Выключить demo mode' : 'Включить demo mode'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleResetLiveState(d)}
                      disabled={busy}
                      style={{
                        borderRadius: 12,
                        padding: '10px 12px',
                        border: '1px solid rgba(250,204,21,0.35)',
                        background: 'rgba(113,63,18,0.35)',
                        color: '#e5e7eb',
                        cursor: busy ? 'default' : 'pointer',
                        flex: '1 1 auto',
                        minWidth: 150,
                        opacity: busy ? 0.7 : 1,
                      }}
                    >
                      Сбросить live
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => void handleCopyLink(d)}
                      style={{
                        borderRadius: 12,
                        padding: '10px 12px',
                        border: '1px solid rgba(96,165,250,0.45)',
                        background: 'rgba(30,58,138,0.35)',
                        color: '#e5e7eb',
                        cursor: 'pointer',
                        flex: '1 1 auto',
                        minWidth: 160,
                      }}
                    >
                      Скопировать ссылку ТВ
                    </button>

                    <a
                      href={tvLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        borderRadius: 12,
                        padding: '10px 12px',
                        border: '1px solid rgba(148,163,184,0.25)',
                        background: 'rgba(2,6,23,0.35)',
                        color: '#e5e7eb',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: '1 1 auto',
                        minWidth: 140,
                      }}
                    >
                      Открыть ТВ
                    </a>

                    <button
                      type="button"
                      onClick={() => void handleDelete(d)}
                      disabled={busy}
                      style={{
                        borderRadius: 12,
                        padding: '10px 12px',
                        border: '1px solid rgba(239,68,68,0.45)',
                        background: 'rgba(127,29,29,0.35)',
                        color: '#e5e7eb',
                        cursor: busy ? 'default' : 'pointer',
                        flex: '0 0 auto',
                        minWidth: 110,
                        opacity: busy ? 0.7 : 1,
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: 18,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.25)',
            background: 'rgba(2,6,23,0.85)',
            color: '#e5e7eb',
            fontSize: 13,
            zIndex: 9999,
            maxWidth: 360,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default DemoDisplaysPage;