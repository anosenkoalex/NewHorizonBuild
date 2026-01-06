import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

type UserRole = 'ADMIN' | 'MANAGER' | 'SALES_HEAD' | 'LEGAL' | 'VIEWER';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// КЛЮЧИ ДОЛЖНЫ СОВПАДАТЬ С api/*
const STORAGE_TOKEN_KEY = 'nhb_token';
const STORAGE_USER_KEY = 'nhb_user';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Инициализация из localStorage
  useEffect(() => {
    // миграция со старых ключей (accessToken/user) если вдруг остались
    const legacyToken = localStorage.getItem('accessToken');
    const legacyUser = localStorage.getItem('user');

    if (legacyToken && legacyUser) {
      localStorage.setItem(STORAGE_TOKEN_KEY, legacyToken);
      localStorage.setItem(STORAGE_USER_KEY, legacyUser);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }

    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const storedUser = localStorage.getItem(STORAGE_USER_KEY);

    if (storedToken && storedUser) {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Неверный логин или пароль');
    }

    const data = await response.json();

    // Пытаемся вытащить токен из всех возможных полей
    const accessToken: string | undefined =
      data.accessToken ?? data.access_token ?? data.token;

    if (!accessToken) {
      console.error('Ответ /auth/login без токена:', data);
      throw new Error('Сервер авторизации вернул некорректный токен');
    }

    const userData: AuthUser = data.user;

    setToken(accessToken);
    setUser(userData);

    localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);

    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);

    // чистим старые ключи на всякий случай
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  };

  const value: AuthContextValue = {
    user,
    token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
