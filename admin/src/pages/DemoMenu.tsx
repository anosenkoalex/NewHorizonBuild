// admin/src/pages/DemoMenu.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchDemoDisplaysPublicList,
  type DemoDisplayPublic,
} from '../api/demoDisplays';

type ThemeMode = 'dark' | 'light';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem('nh-theme');
  return stored === 'light' ? 'light' : 'dark';
}

function formatLastPing(lastPingAt: string | null): string {
  if (!lastPingAt) return 'неизвестно';

  const d = new Date(lastPingAt);
  if (Number.isNaN(d.getTime())) return 'неизвестно';

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (sameDay) return `сегодня ${time}`;
  if (isYesterday) return `вчера ${time}`;

  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}`;
  return `${dateStr} ${time}`;
}

function isOnline(lastPingAt: string | null): boolean {
  if (!lastPingAt) return false;

  const t = new Date(lastPingAt).getTime();
  if (Number.isNaN(t)) return false;

  return Date.now() - t < 70_000;
}

function isSelectableDisplay(d: DemoDisplayPublic): boolean {
  return !!(d.isActive && d.demoEnabled);
}

function hasLiveMode(d: DemoDisplayPublic): boolean {
  return !!(d.currentProjectId || d.currentUnitId);
}

function getModeLabel(
  d: DemoDisplayPublic,
): { label: string; color: string; bg: string } {
  if (!d.isActive) {
    return {
      label: 'Выключен',
      color: '#cbd5e1',
      bg: 'rgba(148,163,184,0.12)',
    };
  }

  if (!d.demoEnabled) {
    return {
      label: 'Demo off',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
    };
  }

  if (hasLiveMode(d)) {
    return {
      label: 'Live',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
    };
  }

  if (d.autoplayEnabled) {
    return {
      label: 'Автодемо',
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.12)',
    };
  }

  return {
    label: 'Ожидание',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.12)',
  };
}

function getDisplayHint(d: DemoDisplayPublic): string {
  if (!d.isActive) {
    return 'Экран выключен';
  }

  if (!d.demoEnabled) {
    return 'Demo mode выключен';
  }

  if (hasLiveMode(d)) {
    return 'Идёт онлайн-показ';
  }

  if (d.autoplayEnabled) {
    return `Автодемо · ${d.autoplayDelaySec ?? 15} сек`;
  }

  return 'Готов к подключению';
}

function compareDisplays(a: DemoDisplayPublic, b: DemoDisplayPublic): number {
  const aSelectable = isSelectableDisplay(a) ? 0 : 1;
  const bSelectable = isSelectableDisplay(b) ? 0 : 1;
  if (aSelectable !== bSelectable) return aSelectable - bSelectable;

  const aOnline = isOnline(a.lastPingAt) ? 0 : 1;
  const bOnline = isOnline(b.lastPingAt) ? 0 : 1;
  if (aOnline !== bOnline) return aOnline - bOnline;

  const aLive = hasLiveMode(a) ? 0 : 1;
  const bLive = hasLiveMode(b) ? 0 : 1;
  if (aLive !== bLive) return aLive - bLive;

  const aOffice = (a.office ?? '').toLowerCase();
  const bOffice = (b.office ?? '').toLowerCase();
  if (aOffice !== bOffice) return aOffice.localeCompare(bOffice);

  const aName = (a.name ?? '').toLowerCase();
  const bName = (b.name ?? '').toLowerCase();
  return aName.localeCompare(bName);
}

async function enterFullscreen() {
  const el = document.documentElement as any;

  try {
    if (document.fullscreenElement) return;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return;
    }
    if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
    }
  } catch (e) {
    console.warn('fullscreen failed', e);
  }
}

const DemoMenu: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [displays, setDisplays] = useState<DemoDisplayPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const syncTheme = () => {
      setTheme(getInitialTheme());
    };

    syncTheme();

    const intervalId = window.setInterval(syncTheme, 700);

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'nh-theme') {
        syncTheme();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const palette = useMemo(() => {
    if (theme === 'light') {
      return {
        pageBg:
          'radial-gradient(circle at top, rgba(59,130,246,0.10), transparent 52%), radial-gradient(circle at bottom right, rgba(16,185,129,0.08), transparent 38%), #eef4fb',
        pageText: '#0f172a',
        headerMuted: 'rgba(15,23,42,0.62)',
        mainBorder: '1px solid rgba(148,163,184,0.35)',
        mainBg:
          'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.98))',
        panelBg: 'rgba(255,255,255,0.78)',
        panelBorder: '1px solid rgba(148,163,184,0.28)',
        cardBg:
          'radial-gradient(circle at top left, rgba(59,130,246,0.10), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,252,0.96))',
        cardDisabledBg: 'rgba(255,255,255,0.72)',
        codeBg: 'rgba(15,23,42,0.04)',
        codeBorder: '1px solid rgba(148,163,184,0.18)',
        primaryAccent: '#2563eb',
        secondaryText: '#475569',
        subtleText: '#64748b',
        errorText: '#b91c1c',
        errorBg: 'rgba(239,68,68,0.08)',
        errorBorder: '1px solid rgba(239,68,68,0.22)',
        shadowStrong: '0 14px 34px rgba(15,23,42,0.10)',
        shadowSoft: '0 12px 30px rgba(59,130,246,0.06)',
        btnBg: 'rgba(255,255,255,0.82)',
        btnText: '#0f172a',
      };
    }

    return {
      pageBg:
        'radial-gradient(circle at top, rgba(56,189,248,0.12), transparent 52%), radial-gradient(circle at bottom right, rgba(59,130,246,0.08), transparent 38%), #020617',
      pageText: '#e5e7eb',
      headerMuted: 'rgba(229,231,235,0.72)',
      mainBorder: '1px solid rgba(30,41,59,0.95)',
      mainBg:
        'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.98))',
      panelBg: 'rgba(15,23,42,0.72)',
      panelBorder: '1px solid rgba(148,163,184,0.35)',
      cardBg:
        'radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 58%), linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.96))',
      cardDisabledBg: 'rgba(15,23,42,0.56)',
      codeBg: 'rgba(255,255,255,0.03)',
      codeBorder: '1px solid rgba(148,163,184,0.12)',
      primaryAccent: '#93c5fd',
      secondaryText: '#cbd5e1',
      subtleText: '#94a3b8',
      errorText: '#fecaca',
      errorBg: 'rgba(127,29,29,0.18)',
      errorBorder: '1px solid rgba(239,68,68,0.3)',
      shadowStrong: '0 14px 34px rgba(2,6,23,0.24)',
      shadowSoft: '0 12px 30px rgba(59,130,246,0.08)',
      btnBg: 'rgba(15,23,42,0.72)',
      btnText: '#e5e7eb',
    };
  }, [theme]);

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

      const items = await fetchDemoDisplaysPublicList();

      if (signal?.aborted) return;

      setDisplays(items);
      setError(null);
    } catch (e: any) {
      if (signal?.aborted) return;

      const isAbortError =
        e?.name === 'AbortError' ||
        String(e?.message ?? '').toLowerCase().includes('abort');

      if (isAbortError) return;

      console.error(e);
      setError(e?.message ?? 'Не удалось загрузить список экранов');
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

  const handleClick = (display: DemoDisplayPublic) => {
    if (!isSelectableDisplay(display)) return;
    navigate(`/demo/${encodeURIComponent(display.code)}`);
  };

  const sortedDisplays = useMemo(() => {
    return [...displays].sort(compareDisplays);
  }, [displays]);

  const selectableDisplays = useMemo(
    () => sortedDisplays.filter(isSelectableDisplay),
    [sortedDisplays],
  );

  const inactiveDisplays = useMemo(
    () => sortedDisplays.filter((d) => !isSelectableDisplay(d)),
    [sortedDisplays],
  );

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        boxSizing: 'border-box',
        padding: '18px 22px',
        background: palette.pageBg,
        color: palette.pageText,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              opacity: 0.58,
              letterSpacing: 1.2,
            }}
          >
            Demo launcher
          </div>

          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 0.5,
              lineHeight: 1.05,
              marginTop: 4,
            }}
          >
            Выбор экрана
          </div>

          <div
            style={{
              fontSize: 13,
              color: palette.secondaryText,
              marginTop: 6,
            }}
          >
            Выберите экран для показа
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: palette.secondaryText,
              lineHeight: 1.45,
              textAlign: 'right',
              minWidth: 120,
            }}
          >
            Доступно: <b>{selectableDisplays.length}</b>
            <br />
            Всего: <b>{sortedDisplays.length}</b>
            {refreshing ? ' · обновление…' : ''}
          </div>

          <button
            type="button"
            onClick={() => void enterFullscreen()}
            style={{
              borderRadius: 14,
              padding: '10px 14px',
              border: palette.panelBorder,
              background: palette.btnBg,
              color: palette.btnText,
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: palette.shadowSoft,
            }}
          >
            Fullscreen
          </button>

          <button
            type="button"
            onClick={() => void load(undefined)}
            disabled={loading || refreshing}
            style={{
              borderRadius: 14,
              padding: '10px 14px',
              border: palette.panelBorder,
              background: palette.btnBg,
              color: palette.btnText,
              cursor: loading || refreshing ? 'default' : 'pointer',
              opacity: loading || refreshing ? 0.7 : 1,
              fontWeight: 600,
              boxShadow: palette.shadowSoft,
            }}
          >
            Обновить
          </button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          borderRadius: 26,
          border: palette.mainBorder,
          padding: 18,
          boxSizing: 'border-box',
          background: palette.mainBg,
          overflow: 'auto',
          boxShadow: palette.shadowStrong,
        }}
      >
        {loading && (
          <div
            style={{
              width: '100%',
              height: '100%',
              minHeight: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            Загрузка экранов...
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              fontSize: 16,
              color: palette.errorText,
              padding: 16,
              borderRadius: 18,
              border: palette.errorBorder,
              background: palette.errorBg,
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && sortedDisplays.length === 0 && (
          <div
            style={{
              minHeight: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontSize: 18,
              color: palette.secondaryText,
              lineHeight: 1.6,
            }}
          >
            Пока нет доступных demo-экранов
          </div>
        )}

        {!loading && !error && sortedDisplays.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <section>
              <div
                style={{
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: palette.subtleText,
                  marginBottom: 12,
                }}
              >
                Активные экраны
              </div>

              {selectableDisplays.length === 0 ? (
                <div
                  style={{
                    fontSize: 15,
                    color: palette.secondaryText,
                    lineHeight: 1.55,
                    padding: '6px 2px',
                  }}
                >
                  Сейчас нет экранов, готовых к показу
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 18,
                  }}
                >
                  {selectableDisplays.map((d) => {
                    const online = isOnline(d.lastPingAt);
                    const mode = getModeLabel(d);

                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleClick(d)}
                        style={{
                          textAlign: 'left',
                          borderRadius: 22,
                          padding: 18,
                          background: palette.cardBg,
                          border: online
                            ? theme === 'light'
                              ? '1px solid rgba(34,197,94,0.45)'
                              : '1px solid rgba(34,197,94,0.7)'
                            : theme === 'light'
                              ? '1px solid rgba(96,165,250,0.35)'
                              : '1px solid rgba(96,165,250,0.4)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 14,
                          minHeight: 210,
                          boxShadow: palette.shadowSoft,
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
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 999,
                                backgroundColor: online ? '#22c55e' : '#60a5fa',
                                boxShadow: online
                                  ? '0 0 0 6px rgba(34,197,94,0.14)'
                                  : '0 0 0 6px rgba(96,165,250,0.10)',
                                flex: '0 0 auto',
                                marginTop: 4,
                              }}
                            />

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 20,
                                  fontWeight: 750,
                                  lineHeight: 1.12,
                                  color: palette.pageText,
                                }}
                              >
                                {d.name || `Экран ${d.code}`}
                              </div>

                              <div
                                style={{
                                  fontSize: 13,
                                  color: palette.secondaryText,
                                  marginTop: 6,
                                }}
                              >
                                {d.office || 'Офис не указан'}
                              </div>
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: 11,
                              padding: '7px 10px',
                              borderRadius: 999,
                              background: mode.bg,
                              color: mode.color,
                              border: `1px solid ${mode.color}44`,
                              textTransform: 'uppercase',
                              letterSpacing: 0.08,
                              fontWeight: 700,
                              flex: '0 0 auto',
                            }}
                          >
                            {mode.label}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              borderRadius: 14,
                              padding: '10px 12px',
                              background: palette.codeBg,
                              border: palette.codeBorder,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                textTransform: 'uppercase',
                                color: palette.subtleText,
                                marginBottom: 4,
                              }}
                            >
                              Код
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: palette.pageText,
                              }}
                            >
                              {d.code}
                            </div>
                          </div>

                          <div
                            style={{
                              borderRadius: 14,
                              padding: '10px 12px',
                              background: palette.codeBg,
                              border: palette.codeBorder,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                textTransform: 'uppercase',
                                color: palette.subtleText,
                                marginBottom: 4,
                              }}
                            >
                              Последний пинг
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: palette.pageText,
                              }}
                            >
                              {formatLastPing(d.lastPingAt)}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 'auto',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              color: palette.secondaryText,
                              lineHeight: 1.45,
                            }}
                          >
                            {getDisplayHint(d)}
                          </div>

                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: palette.primaryAccent,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Открыть →
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {inactiveDisplays.length > 0 && (
              <section>
                <div
                  style={{
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: palette.subtleText,
                    marginBottom: 12,
                  }}
                >
                  Недоступные
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 14,
                  }}
                >
                  {inactiveDisplays.map((d) => {
                    const online = isOnline(d.lastPingAt);
                    const mode = getModeLabel(d);

                    return (
                      <div
                        key={d.id}
                        style={{
                          textAlign: 'left',
                          borderRadius: 18,
                          padding: 16,
                          background: palette.cardDisabledBg,
                          border:
                            theme === 'light'
                              ? '1px solid rgba(148,163,184,0.24)'
                              : '1px solid rgba(71,85,105,0.55)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          minHeight: 160,
                          opacity: 0.78,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                backgroundColor: online ? '#94a3b8' : '#64748b',
                                flex: '0 0 auto',
                              }}
                            />

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 16,
                                  fontWeight: 650,
                                  color: palette.pageText,
                                }}
                              >
                                {d.name || `Экран ${d.code}`}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: palette.secondaryText,
                                  marginTop: 4,
                                }}
                              >
                                {d.office || 'Офис не указан'}
                              </div>
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: 11,
                              padding: '6px 10px',
                              borderRadius: 999,
                              background: mode.bg,
                              color: mode.color,
                              border: `1px solid ${mode.color}33`,
                              textTransform: 'uppercase',
                              letterSpacing: 0.08,
                              fontWeight: 700,
                            }}
                          >
                            {mode.label}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            fontSize: 12,
                            color: palette.secondaryText,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            Код: <b>{d.code}</b>
                          </div>
                          <div>
                            Пинг: <b>{formatLastPing(d.lastPingAt)}</b>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: palette.secondaryText,
                            lineHeight: 1.45,
                          }}
                        >
                          {getDisplayHint(d)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DemoMenu;