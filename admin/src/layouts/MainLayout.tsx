import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchUnits, type Unit } from '../api/units';
import { fetchClients, type Client } from '../api/clients';
import { fetchDeals, type Deal } from '../api/deals';
import { fetchProjects, type Project } from '../api/projects';
import {
  createMyDemoDisplay,
  fetchMyDemoDisplay,
  setAutoplayOnDemoDisplay,
  setDemoEnabledOnDemoDisplay,
  type DemoDisplay,
  updateDemoDisplay,
} from '../api/demoDisplays';

type UserRole = 'ADMIN' | 'MANAGER' | 'SALES_HEAD' | 'LEGAL' | 'VIEWER';
type Theme = 'dark' | 'light';

type ThreeDWorkspaceMeResponse = {
  hasAccess: boolean;
  email: string | null;
  access: {
    id: string;
    email: string;
    fullName: string | null;
    isActive: boolean;
    canAccessWorkspace: boolean;
    canUploadModels: boolean;
    canManageScenes: boolean;
    canConfigureWalkthroughs: boolean;
    canManageBindings: boolean;
    canPublish: boolean;
    canManageAccess: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  permissions: {
    hasAccess: boolean;
    canUploadModels: boolean;
    canManageScenes: boolean;
    canConfigureWalkthroughs: boolean;
    canManageBindings: boolean;
    canPublish: boolean;
    canManageAccess: boolean;
  };
};

interface NavItem {
  label: string;
  to: string;
  roles?: UserRole[];
  requires3DWorkspaceAccess?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const STORAGE_TOKEN_KEY = 'nhb_token';

const navItems: NavItem[] = [
  { label: 'Сводка', to: '/', roles: ['ADMIN', 'SALES_HEAD', 'MANAGER'] },
  { label: 'Объекты', to: '/units', roles: ['ADMIN', 'SALES_HEAD', 'MANAGER'] },
  { label: 'Сделки', to: '/deals', roles: ['ADMIN', 'SALES_HEAD', 'MANAGER', 'LEGAL'] },
  { label: 'Клиенты', to: '/clients', roles: ['ADMIN', 'SALES_HEAD', 'MANAGER', 'LEGAL'] },
  { label: 'Отчёты', to: '/reports', roles: ['ADMIN', 'SALES_HEAD', 'MANAGER'] },
  {
    label: 'Документы',
    to: '/documents',
    roles: ['ADMIN', 'SALES_HEAD', 'MANAGER', 'LEGAL'],
  },
  {
    label: 'Пользователи',
    to: '/users',
    roles: ['ADMIN'],
  },
  {
    label: '3D показы',
    to: '/viewer',
    roles: ['ADMIN', 'SALES_HEAD', 'MANAGER', 'VIEWER'],
  },

  // hidden 3D workspace
  {
    label: '3D-ассеты',
    to: '/3d-models',
    requires3DWorkspaceAccess: true,
  },
  {
    label: '3D-проекты',
    to: '/projects-3d',
    requires3DWorkspaceAccess: true,
  },
  {
    label: 'Demo-экраны',
    to: '/demo-displays',
    requires3DWorkspaceAccess: true,
  },
];

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  SALES_HEAD: 'Рук. продаж',
  LEGAL: 'Юрист',
  VIEWER: 'Наблюдатель',
};

const getNavIcon = (to: string): string => {
  switch (to) {
    case '/':
      return '📊';
    case '/units':
      return '🏗️';
    case '/deals':
      return '📑';
    case '/clients':
      return '👥';
    case '/reports':
      return '📈';
    case '/documents':
      return '📃';
    case '/users':
      return '👤';
    case '/viewer':
      return '🛰️';
    case '/3d-models':
      return '🧩';
    case '/projects-3d':
      return '🏙️';
    case '/demo-displays':
      return '🖥️';
    default:
      return '•';
  }
};

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem('nh-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
};

const getInitialSidebarOpen = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem('nh-sidebar-open');
  if (stored === 'open') return true;
  if (stored === 'closed') return false;
  return false;
};

type SearchResultKind = 'unit' | 'client' | 'deal';

interface SearchResultItem {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle?: string;
}

async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const [units, clients, deals] = await Promise.all([
    fetchUnits({}),
    fetchClients(),
    fetchDeals({}),
  ]);

  const results: SearchResultItem[] = [];

  (units as Unit[]).forEach((u) => {
    const haystack = [
      u.number,
      u.type,
      u.status,
      u.buildingId && `дом ${u.buildingId}`,
      u.sectionId && `секция ${u.sectionId}`,
      u.floorId && `этаж ${u.floorId}`,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack || !haystack.includes(q)) return;

    results.push({
      id: String(u.id),
      kind: 'unit',
      title: u.number
        ? `${u.number} · ${
            u.type === 'APARTMENT'
              ? 'Квартира'
              : u.type === 'COMMERCIAL'
                ? 'Коммерция'
                : 'Паркинг'
          }`
        : `Объект ${u.id}`,
      subtitle: [
        u.status && `Статус: ${u.status}`,
        u.area && `${u.area} м²`,
        typeof u.price === 'number' && `${u.price.toLocaleString()} сом`,
      ]
        .filter(Boolean)
        .join(' • '),
    });
  });

  (clients as Client[]).forEach((c) => {
    const haystack = [c.fullName, c.phone, c.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack || !haystack.includes(q)) return;

    results.push({
      id: String(c.id),
      kind: 'client',
      title: c.fullName,
      subtitle: [c.phone, c.email].filter(Boolean).join(' • '),
    });
  });

  (deals as Deal[]).forEach((d) => {
    const haystack = [
      d.id,
      d.type,
      d.status,
      d.unit?.number,
      d.client?.fullName,
      d.client?.phone,
      d.client?.email,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack || !haystack.includes(q)) return;

    results.push({
      id: String(d.id),
      kind: 'deal',
      title:
        d.client?.fullName ??
        (d.unit?.number ? `Сделка по объекту ${d.unit.number}` : 'Сделка'),
      subtitle: [
        d.unit?.number && `Объект ${d.unit.number}`,
        d.status && `Статус: ${d.status}`,
      ]
        .filter(Boolean)
        .join(' • '),
    });
  });

  const order: Record<SearchResultKind, number> = {
    unit: 0,
    client: 1,
    deal: 2,
  };

  return results.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 20);
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

function getDisplayModeLabel(display: DemoDisplay): string {
  if (!display.isActive) {
    return 'Экран выключен';
  }

  if (!display.demoEnabled) {
    return 'Demo mode выключен';
  }

  if (display.currentUnitId) {
    return 'Live · объект';
  }

  if (display.currentProjectId) {
    return 'Live · проект';
  }

  if (display.autoplayEnabled) {
    return `Автодемо · ${display.autoplayDelaySec ?? 15} сек`;
  }

  return 'Ожидание';
}

function getDisplayModeTone(
  display: DemoDisplay,
): {
  color: string;
  background: string;
  border: string;
} {
  if (!display.isActive) {
    return {
      color: '#64748b',
      background: 'rgba(148,163,184,0.10)',
      border: 'rgba(148,163,184,0.24)',
    };
  }

  if (!display.demoEnabled) {
    return {
      color: '#b45309',
      background: 'rgba(245,158,11,0.10)',
      border: 'rgba(245,158,11,0.24)',
    };
  }

  if (display.currentUnitId || display.currentProjectId) {
    return {
      color: '#166534',
      background: 'rgba(34,197,94,0.10)',
      border: 'rgba(34,197,94,0.24)',
    };
  }

  if (display.autoplayEnabled) {
    return {
      color: '#1d4ed8',
      background: 'rgba(59,130,246,0.10)',
      border: 'rgba(59,130,246,0.24)',
    };
  }

  return {
    color: '#92400e',
    background: 'rgba(234,179,8,0.10)',
    border: 'rgba(234,179,8,0.24)',
  };
}

function getSearchKindLabel(kind: SearchResultKind): string {
  switch (kind) {
    case 'unit':
      return 'Объект';
    case 'client':
      return 'Клиент';
    case 'deal':
      return 'Сделка';
    default:
      return '';
  }
}

function getSearchKindBadge(kind: SearchResultKind): {
  background: string;
  color: string;
} {
  switch (kind) {
    case 'unit':
      return {
        background: 'rgba(59,130,246,0.12)',
        color: '#1d4ed8',
      };
    case 'client':
      return {
        background: 'rgba(16,185,129,0.12)',
        color: '#047857',
      };
    case 'deal':
      return {
        background: 'rgba(168,85,247,0.12)',
        color: '#7c3aed',
      };
    default:
      return {
        background: 'rgba(148,163,184,0.12)',
        color: '#475569',
      };
  }
}

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(
    getInitialSidebarOpen,
  );

  const [hasHidden3DAccess, setHasHidden3DAccess] = useState(false);

  const viewerSidebarSnapshotRef = useRef<boolean | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hoveredSearchKey, setHoveredSearchKey] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [myDemoDisplay, setMyDemoDisplay] = useState<DemoDisplay | null>(null);
  const [demoProjects, setDemoProjects] = useState<Project[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoProjectsLoading, setDemoProjectsLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoActionLoading, setDemoActionLoading] = useState(false);
  const [demoActionMessage, setDemoActionMessage] = useState<string | null>(
    null,
  );
  const [demoName, setDemoName] = useState('');
  const [demoOffice, setDemoOffice] = useState('');
  const [demoAutoplayEnabled, setDemoAutoplayEnabled] = useState(false);
  const [demoAutoplayProjectId, setDemoAutoplayProjectId] = useState('');
  const [demoAutoplayDelaySec, setDemoAutoplayDelaySec] = useState('15');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('nh-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'nh-sidebar-open',
        isSidebarOpen ? 'open' : 'closed',
      );
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    const inViewer = location.pathname === '/viewer';

    if (inViewer) {
      if (viewerSidebarSnapshotRef.current === null) {
        viewerSidebarSnapshotRef.current = isSidebarOpen;
      }

      if (isSidebarOpen) {
        setIsSidebarOpen(false);
      }
      return;
    }

    if (viewerSidebarSnapshotRef.current !== null) {
      setIsSidebarOpen(viewerSidebarSnapshotRef.current);
      viewerSidebarSnapshotRef.current = null;
    }
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    const loadHidden3DAccess = async () => {
      if (!user) {
        if (!cancelled) {
          setHasHidden3DAccess(false);
        }
        return;
      }

      try {
        const token = localStorage.getItem(STORAGE_TOKEN_KEY);

        const res = await fetch(`${API_URL}/three-d-workspace-access/me`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          throw new Error('Не удалось проверить hidden 3D access');
        }

        const data = (await res.json()) as ThreeDWorkspaceMeResponse;

        if (!cancelled) {
          setHasHidden3DAccess(!!data?.permissions?.hasAccess);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setHasHidden3DAccess(false);
        }
      }
    };

    void loadHidden3DAccess();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearchLoading(false);
      setHoveredSearchKey(null);
      return;
    }

    let cancelled = false;
    setIsSearchLoading(true);

    const timeoutId = window.setTimeout(() => {
      performGlobalSearch(searchQuery)
        .then((items) => {
          if (cancelled) return;
          setSearchResults(items);
          setSearchError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setSearchResults([]);
          setSearchError(
            err instanceof Error ? err.message : 'Ошибка при поиске',
          );
        })
        .finally(() => {
          if (cancelled) return;
          setIsSearchLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isDemoModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDemoModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDemoModalOpen]);

  useEffect(() => {
    setDemoName(myDemoDisplay?.name ?? '');
    setDemoOffice(myDemoDisplay?.office ?? '');
    setDemoAutoplayEnabled(myDemoDisplay?.autoplayEnabled ?? false);
    setDemoAutoplayProjectId(myDemoDisplay?.autoplayProjectId ?? '');
    setDemoAutoplayDelaySec(String(myDemoDisplay?.autoplayDelaySec ?? 15));
  }, [myDemoDisplay]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setIsSearchOpen(true);
  };

  const handleSearchFocus = () => {
    if (searchQuery.trim()) {
      setIsSearchOpen(true);
    }
  };

  const handleSearchKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter') {
      if (searchResults[0]) {
        event.preventDefault();
        handleSearchResultClick(searchResults[0]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsSearchOpen(false);
      (event.target as HTMLInputElement).blur();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setHoveredSearchKey(null);
  };

  const handleSearchResultClick = (item: SearchResultItem) => {
    clearSearch();
    setIsSearchOpen(false);

    switch (item.kind) {
      case 'unit':
        navigate('/units', { state: { focusUnitId: item.id } });
        break;
      case 'client':
        navigate(`/clients/${item.id}`);
        break;
      case 'deal':
        navigate(`/deals/${item.id}`);
        break;
      default:
        break;
    }
  };

  const loadMyDemoDisplay = async () => {
    try {
      setDemoLoading(true);
      setDemoError(null);

      const display = await fetchMyDemoDisplay();
      setMyDemoDisplay(display);
    } catch (e: any) {
      console.error(e);
      setDemoError(e?.message ?? 'Не удалось загрузить мой demo-экран');
    } finally {
      setDemoLoading(false);
    }
  };

  const loadDemoProjects = async () => {
    try {
      setDemoProjectsLoading(true);

      const projects = await fetchProjects();
      setDemoProjects(projects);
    } catch (e: any) {
      console.error(e);
      setDemoError((prev) => prev ?? (e?.message ?? 'Не удалось загрузить проекты'));
    } finally {
      setDemoProjectsLoading(false);
    }
  };

  const handleOpenDemoModal = async () => {
    setIsDemoModalOpen(true);
    setDemoActionMessage(null);
    setDemoError(null);

    await Promise.all([loadMyDemoDisplay(), loadDemoProjects()]);
  };

  const visibleNavItems = useMemo(
    () =>
      navItems.filter((item) => {
        if (item.requires3DWorkspaceAccess) {
          return hasHidden3DAccess;
        }

        if (!item.roles || item.roles.length === 0) return true;
        if (!user) return false;

        return item.roles.includes(user.role as UserRole);
      }),
    [user, hasHidden3DAccess],
  );

  const userInitials =
    user?.fullName
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join('') || '';

  const SIDEBAR_WIDTH = 260;

  const handleSaveMyDemoDisplay = async () => {
    const normalizedName = demoName.trim();
    const normalizedOffice = normalizeNullableText(demoOffice);

    if (!normalizedName) {
      setDemoActionMessage('Введите название экрана');
      return;
    }

    try {
      setDemoActionLoading(true);
      setDemoActionMessage(null);

      const updated = myDemoDisplay
        ? await updateDemoDisplay(myDemoDisplay.id, {
            name: normalizedName,
            office: normalizedOffice,
          })
        : await createMyDemoDisplay({
            name: normalizedName,
            office: normalizedOffice,
          });

      setMyDemoDisplay(updated);
      setDemoActionMessage(
        myDemoDisplay ? 'Настройки экрана сохранены' : 'Экран создан',
      );
    } catch (e: any) {
      console.error(e);
      setDemoActionMessage(e?.message ?? 'Не удалось сохранить экран');
    } finally {
      setDemoActionLoading(false);
    }
  };

  const handleToggleDemoMode = async () => {
    if (!myDemoDisplay) return;

    try {
      setDemoActionLoading(true);
      setDemoActionMessage(null);

      const updated = await setDemoEnabledOnDemoDisplay(myDemoDisplay.id, {
        enabled: !myDemoDisplay.demoEnabled,
      });

      setMyDemoDisplay(updated);
      setDemoActionMessage(
        updated.demoEnabled ? 'Demo mode включён' : 'Demo mode выключен',
      );
    } catch (e: any) {
      console.error(e);
      setDemoActionMessage(
        e?.message ?? 'Не удалось переключить demo mode',
      );
    } finally {
      setDemoActionLoading(false);
    }
  };

  const handleToggleDemoActive = async () => {
    if (!myDemoDisplay) return;

    try {
      setDemoActionLoading(true);
      setDemoActionMessage(null);

      const updated = await updateDemoDisplay(myDemoDisplay.id, {
        isActive: !myDemoDisplay.isActive,
      });

      setMyDemoDisplay(updated);
      setDemoActionMessage(
        updated.isActive ? 'Экран активирован' : 'Экран выключен',
      );
    } catch (e: any) {
      console.error(e);
      setDemoActionMessage(e?.message ?? 'Не удалось обновить экран');
    } finally {
      setDemoActionLoading(false);
    }
  };

  const handleSaveAutoplay = async () => {
    if (!myDemoDisplay) return;

    if (demoAutoplayEnabled) {
      const delay = Number(demoAutoplayDelaySec);

      if (!Number.isFinite(delay) || delay < 3) {
        setDemoActionMessage('Задержка автодемо должна быть не меньше 3 секунд');
        return;
      }
    }

    try {
      setDemoActionLoading(true);
      setDemoActionMessage(null);

      const updated = await setAutoplayOnDemoDisplay(myDemoDisplay.id, {
        enabled: demoAutoplayEnabled,
        autoplayProjectId: demoAutoplayProjectId || null,
        autoplayDelaySec: demoAutoplayEnabled
          ? Number(demoAutoplayDelaySec)
          : null,
      });

      setMyDemoDisplay(updated);
      setDemoActionMessage(
        demoAutoplayEnabled
          ? 'Настройки автодемо сохранены'
          : 'Автодемо выключено',
      );
    } catch (e: any) {
      console.error(e);
      setDemoActionMessage(
        e?.message ?? 'Не удалось сохранить настройки автодемо',
      );
    } finally {
      setDemoActionLoading(false);
    }
  };

  const handleCopyDemoLink = async () => {
    if (!myDemoDisplay) return;

    const link = `${window.location.origin}/demo/${myDemoDisplay.code}`;

    try {
      await navigator.clipboard.writeText(link);
      setDemoActionMessage('Ссылка на ТВ скопирована');
    } catch {
      setDemoActionMessage(link);
    }
  };

  const directDemoLink = myDemoDisplay
    ? `${window.location.origin}/demo/${myDemoDisplay.code}`
    : '';

  const displayModeTone = myDemoDisplay
    ? getDisplayModeTone(myDemoDisplay)
    : null;

  return (
    <div className={`app-shell theme-${theme}`}>
      <aside
        className="sidebar"
        style={{
          width: isSidebarOpen ? SIDEBAR_WIDTH : 0,
          minWidth: isSidebarOpen ? SIDEBAR_WIDTH : 0,
          paddingLeft: isSidebarOpen ? undefined : 0,
          paddingRight: isSidebarOpen ? undefined : 0,
          borderRight: isSidebarOpen ? undefined : 'none',
          overflow: 'hidden',
          opacity: isSidebarOpen ? 1 : 0,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-12px)',
          willChange: 'width, opacity, transform',
          transition:
            'width 0.26s ease-in-out, ' +
            'padding 0.26s ease-in-out, ' +
            'border-right-width 0.26s ease-in-out, ' +
            'border-right-color 0.26s ease-in-out, ' +
            'opacity 0.24s ease-out, ' +
            'transform 0.24s ease-out',
        }}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo-mark">NH</div>
          {isSidebarOpen && (
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-title">NewHorizonBuild</div>
              <div className="sidebar-logo-subtitle">CRM застройщика</div>
            </div>
          )}
        </div>

        {isSidebarOpen && (
          <>
            <nav className="nav-links">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-link${isActive ? ' active' : ''}`
                  }
                  end={item.to === '/'}
                >
                  <span className="nav-link-icon">{getNavIcon(item.to)}</span>
                  <span className="nav-link-label">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="sidebar-user">
              {user && (
                <div className="sidebar-user-main">
                  <div className="sidebar-user-avatar">{userInitials || 'U'}</div>
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-name">
                      {user.fullName || 'Пользователь'}
                    </div>
                    <div className="sidebar-user-role">
                      {roleLabels[user.role as UserRole] || user.role}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="sidebar-logout-btn"
              >
                Выйти
              </button>
            </div>
          </>
        )}
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Открыть меню"
              className="topbar-burger"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: '1px solid rgba(148,163,184,0.45)',
                background: 'rgba(15,23,42,0.9)',
                color: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              ☰
            </button>

            <div>
              <div className="topbar-title">CRM NewHorizonBuild</div>
              <div className="topbar-subtitle">
                Роли, продажи, объекты и 3D-показы
              </div>
            </div>
          </div>

          <div className="topbar-center">
            <div
              ref={searchContainerRef}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 520,
              }}
            >
              <div style={{ position: 'relative' }}>
                <input
                  type="search"
                  className="topbar-search"
                  placeholder="Поиск по юнитам, клиентам, сделкам"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  onKeyDown={handleSearchKeyDown}
                  style={{
                    width: '100%',
                    paddingRight: searchQuery ? 42 : undefined,
                  }}
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Очистить поиск"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: 10,
                      transform: 'translateY(-50%)',
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: 'none',
                      background: 'rgba(148,163,184,0.16)',
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {isSearchOpen && searchQuery && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    right: 0,
                    marginTop: 8,
                    borderRadius: 16,
                    border: '1px solid rgba(148,163,184,0.22)',
                    background: '#ffffff',
                    boxShadow: '0 24px 60px rgba(15,23,42,0.18)',
                    maxHeight: 380,
                    overflowY: 'auto',
                    padding: 10,
                    zIndex: 30,
                  }}
                >
                  <div
                    style={{
                      padding: '4px 6px 10px',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.08,
                      color: '#64748b',
                    }}
                  >
                    Результаты поиска
                  </div>

                  {isSearchLoading && (
                    <div
                      style={{
                        padding: '12px 10px',
                        fontSize: 13,
                        color: '#475569',
                      }}
                    >
                      Поиск...
                    </div>
                  )}

                  {searchError && !isSearchLoading && (
                    <div
                      style={{
                        padding: '12px 10px',
                        fontSize: 13,
                        color: '#dc2626',
                        background: 'rgba(239,68,68,0.06)',
                        borderRadius: 12,
                      }}
                    >
                      {searchError}
                    </div>
                  )}

                  {!isSearchLoading &&
                    !searchError &&
                    searchResults.length === 0 && (
                      <div
                        style={{
                          padding: '14px 12px',
                          fontSize: 13,
                          color: '#475569',
                          background: '#f8fafc',
                          borderRadius: 12,
                        }}
                      >
                        Ничего не найдено
                      </div>
                    )}

                  {searchResults.map((item) => {
                    const key = `${item.kind}-${item.id}`;
                    const badge = getSearchKindBadge(item.kind);
                    const isHovered = hoveredSearchKey === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSearchResultClick(item)}
                        onMouseEnter={() => setHoveredSearchKey(key)}
                        onMouseLeave={() => setHoveredSearchKey(null)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: '1px solid rgba(148,163,184,0.14)',
                          background: isHovered ? '#f8fafc' : '#ffffff',
                          padding: '12px 12px',
                          borderRadius: 14,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          marginBottom: 8,
                          transition:
                            'background 0.16s ease, border-color 0.16s ease, transform 0.16s ease',
                          transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
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
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            {item.title}
                          </span>

                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: 999,
                              background: badge.background,
                              color: badge.color,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {getSearchKindLabel(item.kind)}
                          </span>
                        </div>

                        {item.subtitle && (
                          <span
                            style={{
                              fontSize: 12,
                              color: '#475569',
                              lineHeight: 1.45,
                            }}
                          >
                            {item.subtitle}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              onClick={() => void handleOpenDemoModal()}
              style={{
                borderRadius: 999,
                border: '1px solid rgba(96,165,250,0.45)',
                background: 'rgba(30,58,138,0.16)',
                color: '#1d4ed8',
                height: 36,
                padding: '0 14px',
                cursor: 'pointer',
                fontWeight: 600,
                marginRight: 10,
              }}
            >
              TV / Demo
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="topbar-theme-toggle"
              title={
                theme === 'dark'
                  ? 'Переключить на светлую тему'
                  : 'Переключить на тёмную тему'
              }
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {user && (
              <div className="topbar-user">
                <div className="topbar-user-avatar">{userInitials || 'U'}</div>
                <div className="topbar-user-text">
                  <div className="topbar-user-name">
                    {user.fullName || 'Пользователь'}
                  </div>
                  <div className="topbar-user-role">
                    {roleLabels[user.role as UserRole] || user.role}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="content-area">
          <Outlet />
        </div>
      </main>

      {isDemoModalOpen && (
        <div
          onClick={() => setIsDemoModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.55)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(860px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              borderRadius: 22,
              border: '1px solid rgba(148,163,184,0.22)',
              background: '#ffffff',
              color: '#0f172a',
              boxShadow: '0 30px 80px rgba(2,6,23,0.28)',
              padding: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    opacity: 0.6,
                  }}
                >
                  TV / Demo
                </div>
                <h2 style={{ margin: '6px 0 0', fontSize: 28 }}>
                  Мой demo-экран
                </h2>
                <div style={{ marginTop: 6, fontSize: 14, opacity: 0.75 }}>
                  Управляй своим экраном, включай demo mode, настраивай
                  автодемо и копируй ссылку для телевизора.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                style={{
                  borderRadius: 999,
                  width: 38,
                  height: 38,
                  border: '1px solid rgba(148,163,184,0.28)',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 18,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.1fr 0.9fr',
                gap: 16,
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  border: '1px solid rgba(148,163,184,0.22)',
                  background: '#f8fafc',
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {myDemoDisplay ? 'Настройки экрана' : 'Создание экрана'}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void Promise.all([loadMyDemoDisplay(), loadDemoProjects()])
                    }
                    disabled={demoLoading || demoProjectsLoading}
                    style={{
                      borderRadius: 10,
                      padding: '8px 10px',
                      border: '1px solid rgba(148,163,184,0.28)',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {demoLoading || demoProjectsLoading
                      ? 'Обновление...'
                      : 'Обновить'}
                  </button>
                </div>

                {demoError && (
                  <div
                    style={{
                      marginBottom: 12,
                      color: '#dc2626',
                      fontSize: 13,
                    }}
                  >
                    {demoError}
                  </div>
                )}

                {demoLoading ? (
                  <div style={{ fontSize: 14, opacity: 0.75 }}>Загрузка...</div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}
                        >
                          Название
                        </div>
                        <input
                          value={demoName}
                          onChange={(e) => setDemoName(e.target.value)}
                          placeholder="Название экрана"
                          style={{
                            width: '100%',
                            borderRadius: 12,
                            border: '1px solid rgba(148,163,184,0.28)',
                            background: '#fff',
                            color: '#0f172a',
                            padding: '10px 12px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <div
                          style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}
                        >
                          Офис
                        </div>
                        <input
                          value={demoOffice}
                          onChange={(e) => setDemoOffice(e.target.value)}
                          placeholder="Офис (опционально)"
                          style={{
                            width: '100%',
                            borderRadius: 12,
                            border: '1px solid rgba(148,163,184,0.28)',
                            background: '#fff',
                            color: '#0f172a',
                            padding: '10px 12px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {myDemoDisplay ? (
                      <div
                        style={{
                          marginTop: 14,
                          borderRadius: 14,
                          border: '1px solid rgba(148,163,184,0.2)',
                          background: '#fff',
                          padding: 12,
                          fontSize: 13,
                          lineHeight: 1.65,
                        }}
                      >
                        <div>
                          Код: <b>{myDemoDisplay.code}</b>
                        </div>
                        <div>
                          Статус экрана:{' '}
                          <b>{myDemoDisplay.isActive ? 'активен' : 'выключен'}</b>
                        </div>
                        <div>
                          Demo mode:{' '}
                          <b>
                            {myDemoDisplay.demoEnabled ? 'включён' : 'выключен'}
                          </b>
                        </div>
                        <div>
                          Режим:{' '}
                          <b
                            style={{
                              color: displayModeTone?.color,
                            }}
                          >
                            {getDisplayModeLabel(myDemoDisplay)}
                          </b>
                        </div>
                        <div>
                          Последний viewer:{' '}
                          <b>{formatDateTime(myDemoDisplay.lastViewerActivityAt)}</b>
                        </div>
                        <div>
                          Последний пинг ТВ:{' '}
                          <b>{formatDateTime(myDemoDisplay.lastPingAt)}</b>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 14,
                          borderRadius: 14,
                          border: '1px solid rgba(148,163,184,0.2)',
                          background: '#fff',
                          padding: 12,
                          fontSize: 13,
                          lineHeight: 1.65,
                          opacity: 0.86,
                        }}
                      >
                        У тебя пока нет demo-экрана. Создай его один раз, после
                        чего телевизор можно будет подключать по постоянной ссылке.
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 14,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => void handleSaveMyDemoDisplay()}
                        disabled={demoActionLoading}
                        style={{
                          borderRadius: 12,
                          padding: '10px 14px',
                          border: '1px solid rgba(59,130,246,0.45)',
                          background: '#2563eb',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {myDemoDisplay ? 'Сохранить' : 'Создать экран'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggleDemoMode()}
                        disabled={demoActionLoading || !myDemoDisplay}
                        style={{
                          borderRadius: 12,
                          padding: '10px 14px',
                          border: myDemoDisplay?.demoEnabled
                            ? '1px solid rgba(239,68,68,0.35)'
                            : '1px solid rgba(34,197,94,0.35)',
                          background: myDemoDisplay?.demoEnabled
                            ? 'rgba(127,29,29,0.08)'
                            : 'rgba(22,163,74,0.08)',
                          color: '#0f172a',
                          cursor:
                            demoActionLoading || !myDemoDisplay
                              ? 'not-allowed'
                              : 'pointer',
                          opacity: myDemoDisplay ? 1 : 0.55,
                        }}
                      >
                        {myDemoDisplay?.demoEnabled
                          ? 'Выключить demo mode'
                          : 'Включить demo mode'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggleDemoActive()}
                        disabled={demoActionLoading || !myDemoDisplay}
                        style={{
                          borderRadius: 12,
                          padding: '10px 14px',
                          border: myDemoDisplay?.isActive
                            ? '1px solid rgba(239,68,68,0.35)'
                            : '1px solid rgba(34,197,94,0.35)',
                          background: myDemoDisplay?.isActive
                            ? 'rgba(127,29,29,0.08)'
                            : 'rgba(22,163,74,0.08)',
                          color: '#0f172a',
                          cursor:
                            demoActionLoading || !myDemoDisplay
                              ? 'not-allowed'
                              : 'pointer',
                          opacity: myDemoDisplay ? 1 : 0.55,
                        }}
                      >
                        {myDemoDisplay?.isActive
                          ? 'Выключить экран'
                          : 'Активировать экран'}
                      </button>
                    </div>

                    {demoActionMessage && (
                      <div
                        style={{
                          marginTop: 14,
                          fontSize: 13,
                          color: '#0f172a',
                          opacity: 0.82,
                        }}
                      >
                        {demoActionMessage}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 14,
                        fontSize: 12,
                        opacity: 0.68,
                        lineHeight: 1.5,
                      }}
                    >
                      Live-показ управляется через Viewer. Когда сотрудник открывает
                      3D Viewer, состояние экрана синхронизируется автоматически.
                    </div>
                  </>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    borderRadius: 18,
                    border: '1px solid rgba(148,163,184,0.22)',
                    background: '#f8fafc',
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 12,
                    }}
                  >
                    Автодемо
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <input
                      id="demo-autoplay-enabled"
                      type="checkbox"
                      checked={demoAutoplayEnabled}
                      onChange={(e) =>
                        setDemoAutoplayEnabled(e.target.checked)
                      }
                      disabled={!myDemoDisplay || demoActionLoading}
                    />
                    <label
                      htmlFor="demo-autoplay-enabled"
                      style={{ fontSize: 13 }}
                    >
                      Включить автодемо, когда нет live-показа
                    </label>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}
                    >
                      Проект для автодемо
                    </div>
                    <select
                      value={demoAutoplayProjectId}
                      onChange={(e) => setDemoAutoplayProjectId(e.target.value)}
                      disabled={
                        !myDemoDisplay || demoActionLoading || demoProjectsLoading
                      }
                      style={{
                        width: '100%',
                        borderRadius: 12,
                        border: '1px solid rgba(148,163,184,0.28)',
                        background: '#fff',
                        color: '#0f172a',
                        padding: '10px 12px',
                        outline: 'none',
                      }}
                    >
                      <option value="">Все проекты</option>
                      {demoProjects.map((project) => (
                        <option key={project.id} value={String(project.id)}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}
                    >
                      Задержка переключения, сек
                    </div>
                    <input
                      type="number"
                      min={3}
                      step={1}
                      value={demoAutoplayDelaySec}
                      onChange={(e) => setDemoAutoplayDelaySec(e.target.value)}
                      disabled={!myDemoDisplay || demoActionLoading}
                      style={{
                        width: '100%',
                        borderRadius: 12,
                        border: '1px solid rgba(148,163,184,0.28)',
                        background: '#fff',
                        color: '#0f172a',
                        padding: '10px 12px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSaveAutoplay()}
                    disabled={!myDemoDisplay || demoActionLoading}
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      padding: '10px 14px',
                      border: '1px solid rgba(14,165,233,0.35)',
                      background: '#0ea5e9',
                      color: '#fff',
                      cursor:
                        !myDemoDisplay || demoActionLoading
                          ? 'not-allowed'
                          : 'pointer',
                      fontWeight: 600,
                      opacity: myDemoDisplay ? 1 : 0.55,
                    }}
                  >
                    Сохранить автодемо
                  </button>
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    border: '1px solid rgba(148,163,184,0.22)',
                    background: '#f8fafc',
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 12,
                    }}
                  >
                    Быстрые действия
                  </div>

                  {myDemoDisplay && (
                    <div
                      style={{
                        marginBottom: 12,
                        fontSize: 12,
                        lineHeight: 1.5,
                        wordBreak: 'break-all',
                        opacity: 0.8,
                      }}
                    >
                      Прямая ссылка на экран:
                      <br />
                      <b>{directDemoLink}</b>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => void handleCopyDemoLink()}
                      disabled={demoActionLoading || !myDemoDisplay}
                      style={{
                        borderRadius: 12,
                        padding: '10px 14px',
                        border: '1px solid rgba(148,163,184,0.28)',
                        background: '#fff',
                        color: '#0f172a',
                        cursor:
                          demoActionLoading || !myDemoDisplay
                            ? 'not-allowed'
                            : 'pointer',
                        opacity: myDemoDisplay ? 1 : 0.55,
                      }}
                    >
                      Скопировать ссылку ТВ
                    </button>

                    <a
                      href="/viewer"
                      style={{
                        borderRadius: 12,
                        padding: '10px 14px',
                        border: '1px solid rgba(148,163,184,0.28)',
                        background: '#fff',
                        color: '#0f172a',
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      Открыть 3D Viewer
                    </a>

                    <a
                      href="/demo"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        borderRadius: 12,
                        padding: '10px 14px',
                        border: '1px solid rgba(148,163,184,0.28)',
                        background: '#fff',
                        color: '#0f172a',
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      Открыть /demo
                    </a>

                    {myDemoDisplay && (
                      <a
                        href={`/demo/${myDemoDisplay.code}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          borderRadius: 12,
                          padding: '10px 14px',
                          border: '1px solid rgba(148,163,184,0.28)',
                          background: '#fff',
                          color: '#0f172a',
                          textDecoration: 'none',
                          textAlign: 'center',
                        }}
                      >
                        Открыть мой экран
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;