# Skill — MERN Stack Patterns

## Express App Full Setup

```typescript
// src/app.ts
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { globalLimiter } from '@/middleware/rateLimiter';
import { errorHandler } from '@/middleware/errorHandler';
import { notFound } from '@/middleware/notFound';
import { env } from '@/config/env';
import userRoutes from '@/modules/user/user.routes';
import authRoutes from '@/modules/auth/auth.routes';

const createApp = (): Application => {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
  app.use(globalLimiter);
  app.use(mongoSanitize());

  // Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Health check
  app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Routes
  app.use('/api/v1/auth',  authRoutes);
  app.use('/api/v1/users', userRoutes);

  // Error handling — LAST
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
export default createApp;
```

---

## Auth Service

```typescript
// src/modules/auth/auth.service.ts
export class AuthService {
  async login(dto: LoginDto) {
    const user = await userRepository.findByEmailWithPassword(dto.email);
    if (!user) throw new UnauthorizedError();

    const isValid = await verifyPassword(dto.password, user.password);
    if (!isValid) throw new UnauthorizedError();

    const tokens = generateTokens(user._id.toString());
    await userRepository.setRefreshToken(user._id.toString(), tokens.refreshToken);

    const { password, ...safe } = user.toObject();
    return { user: safe, ...tokens };
  }

  async register(dto: RegisterDto) {
    if (await userRepository.findByEmail(dto.email)) throw new ConflictError('Email already in use');
    const user = await userRepository.create({ ...dto, password: await hashPassword(dto.password) });
    const tokens = generateTokens(user._id.toString());
    const { password, ...safe } = user.toObject();
    return { user: safe, ...tokens };
  }

  async logout(userId: string) { await userRepository.clearRefreshToken(userId); }
}
```

---

## Zustand Auth Store

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    immer((set) => ({
      user: null, accessToken: null, isAuthenticated: false, isLoading: true,

      setAuth:    (user, accessToken) => set((s) => { s.user = user; s.accessToken = accessToken; s.isAuthenticated = true; s.isLoading = false; }),
      updateUser: (data) => set((s) => { if (s.user) Object.assign(s.user, data); }),
      setLoading: (loading) => set((s) => { s.isLoading = loading; }),
      logout:     () => set((s) => { s.user = null; s.accessToken = null; s.isAuthenticated = false; s.isLoading = false; }),
    })),
    { name: 'auth-storage', storage: createJSONStorage(() => sessionStorage), partialize: (s) => ({ user: s.user, accessToken: s.accessToken }) }
  )
);
```

---

## React Router v6 — Full Setup

```typescript
// src/App.tsx
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<PublicGuard />}>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.AUTH.LOGIN}    element={<LoginPage />} />
          <Route path={ROUTES.AUTH.REGISTER} element={<RegisterPage />} />
        </Route>
      </Route>

      <Route element={<AuthGuard />}>
        <Route element={<DashboardLayout />}>
          <Route path={ROUTES.DASHBOARD}         element={<DashboardPage />} />
          <Route path={ROUTES.USERS.LIST}         element={<UsersPage />} />
          <Route path={ROUTES.USERS.DETAIL(':id')} element={<UserDetailPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BrowserRouter>
);
```

---

## Axios Instance + Interceptors

```typescript
// src/services/api.ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await authService.refreshToken();
        return api(error.config);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Pagination Pattern

```typescript
// src/utils/pagination.ts
export const getPaginationMeta = (page: number, limit: number, total: number) => ({
  page, limit, total,
  totalPages: Math.ceil(total / limit),
  hasNext: page < Math.ceil(total / limit),
  hasPrev: page > 1,
  from: (page - 1) * limit + 1,
  to: Math.min(page * limit, total),
});

// src/hooks/usePagination.ts
export const usePagination = (initialPage = 1, initialLimit = 20) => {
  const [page, setPage]   = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  return {
    page, limit, setLimit,
    goToPage: useCallback((p: number) => setPage(p), []),
    nextPage: useCallback(() => setPage(p => p + 1), []),
    prevPage: useCallback(() => setPage(p => p - 1), []),
    reset:    useCallback(() => setPage(1), []),
  };
};
```
