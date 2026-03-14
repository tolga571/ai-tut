# 07 — State Management Decision Guide

## Decision Protocol

Before starting any project, Claude evaluates the project and presents a recommendation with reasoning. **The user makes the final decision.**

---

## Decision Matrix

Score each question. Highest score wins.

| Question | Zustand (+1) | Redux Toolkit (+1) |
|----------|-------------|-------------------|
| Project size? | Small-medium (1-5 devs) | Large/enterprise (5+ devs) |
| State complexity? | Simple-medium (auth, UI, basic CRUD) | Complex (deeply nested, complex flows) |
| Middleware needs? | None / minimal | Saga, Thunk, complex async flows |
| DevTools importance? | Secondary | Primary (time-travel debug is critical) |
| Team knows Redux? | No | Yes |
| Boilerplate tolerance? | Minimal boilerplate preferred | Standardized structure is important |
| Mostly server state? | Yes (React Query is sufficient) | No (heavy client state) |

**Zustand: 5+ → recommend Zustand**
**Redux: 5+ → recommend Redux Toolkit**
**Tie → Zustand (small project) / Redux (large project)**

---

## Quick Decision Guide

```
What kind of project?
├── Startup MVP / Personal / Small SaaS
│   └── → Zustand (fast, minimal boilerplate)
│
├── Medium-scale (3-5 devs, 6+ months)
│   ├── Mostly server state? → React Query + Zustand (auth/UI only)
│   └── Heavy client state?  → Consider Redux Toolkit
│
└── Enterprise / Large team / Legacy integration
    └── → Redux Toolkit (ecosystem, standardization)
```

---

## Zustand — When to Use

**Best for:** auth state, UI state (sidebar, modals, theme), simple forms, small-medium projects, alongside React Query

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
interface AuthActions {
  setAuth: (user: User, token: string) => void;
  updateUser: (data: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      immer((set) => ({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: true,

        setAuth: (user, accessToken) => set((s) => {
          s.user = user; s.accessToken = accessToken;
          s.isAuthenticated = true; s.isLoading = false;
        }),
        updateUser: (data) => set((s) => { if (s.user) Object.assign(s.user, data); }),
        setLoading: (loading) => set((s) => { s.isLoading = loading; }),
        logout: () => set((s) => {
          s.user = null; s.accessToken = null;
          s.isAuthenticated = false; s.isLoading = false;
        }),
      })),
      { name: 'auth-store', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }) }
    ),
    { name: 'AuthStore' }
  )
);

// UI state — separate store
export const useUIStore = create<UIState & UIActions>()(
  devtools(
    immer((set) => ({
      sidebarOpen: true,
      theme: 'light' as 'light' | 'dark',
      activeModal: null as string | null,

      toggleSidebar: () => set((s) => { s.sidebarOpen = !s.sidebarOpen; }),
      setTheme: (theme) => set((s) => { s.theme = theme; }),
      openModal: (id) => set((s) => { s.activeModal = id; }),
      closeModal: () => set((s) => { s.activeModal = null; }),
    })),
    { name: 'UIStore' }
  )
);
```

---

## Redux Toolkit — When to Use

**Best for:** 5+ devs, complex async flows, time-travel debugging critical, existing Redux codebase

```typescript
// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials: LoginDto, { rejectWithValue }) => {
    try {
      return await authService.login(credentials);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null } as AuthState,
  reducers: {
    logout: (state) => { state.user = null; state.accessToken = null; state.isAuthenticated = false; },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) Object.assign(state.user, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending,   (state)          => { state.isLoading = true; state.error = null; })
      .addCase(loginThunk.fulfilled, (state, action)  => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(loginThunk.rejected,  (state, action)  => {
        state.error = action.payload as string;
        state.isLoading = false;
      });
  },
});

export const { logout, updateUser } = authSlice.actions;
export default authSlice.reducer;

// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
export const store = configureStore({ reducer: { auth: authReducer, ui: uiReducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

---

## Claude's Recommendation Format

When starting a new project, Claude presents:

> **State Management Assessment**
>
> Based on project analysis:
> - Project size: [small/medium/large]
> - State complexity: [simple/medium/complex]
> - Real-time / async needs: [yes/no]
> - Estimated team size: [n]
>
> **My recommendation: [Zustand / Redux Toolkit]**
> Because: [1-2 sentence reasoning]
>
> Should I proceed with Zustand, or would you prefer Redux Toolkit?

---

## Hybrid Pattern (Common in Medium+ Projects)

```typescript
// Recommended split:
// React Query  → server state (API data, caching, sync)
// Zustand      → client state (auth, UI, transient state)

// Example:
useQuery('users')       // user list from server  → React Query
useAuthStore()          // session info            → Zustand
useUIStore()            // sidebar / modal         → Zustand
useMutation()           // create/update/delete    → React Query
```
