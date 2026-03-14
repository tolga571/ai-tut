# 04 — Project Structure

## MERN Stack — Backend

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              ← Zod env validation
│   │   ├── database.ts         ← DB connection
│   │   └── logger.ts           ← Winston/Pino config
│   ├── constants/              ← All static data lives here
│   │   ├── index.ts
│   │   ├── roles.ts
│   │   ├── status.ts
│   │   └── messages.ts         ← API response messages
│   ├── modules/                ← Feature-based modular structure
│   │   └── user/
│   │       ├── user.controller.ts
│   │       ├── user.service.ts
│   │       ├── user.repository.ts
│   │       ├── user.routes.ts
│   │       ├── user.schema.ts       ← Mongoose schema
│   │       ├── user.validation.ts   ← Zod schemas
│   │       └── user.types.ts        ← TypeScript types/interfaces
│   ├── middleware/
│   │   ├── auth.ts             ← authenticate, authorize
│   │   ├── errorHandler.ts     ← Global error handler
│   │   ├── rateLimiter.ts
│   │   ├── validate.ts         ← Zod validation middleware
│   │   └── notFound.ts
│   ├── utils/
│   │   ├── ApiResponse.ts      ← Standard response format
│   │   ├── catchAsync.ts       ← Async error wrapper
│   │   └── pagination.ts
│   ├── types/
│   │   ├── express.d.ts        ← Express Request augmentation
│   │   └── index.ts
│   └── app.ts                  ← Express app setup
├── .env.example
├── .gitignore
└── package.json
```

## MERN Stack — Frontend (React/Vite)

```
frontend/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/                 ← Base UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Table.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── shared/             ← Used across multiple pages
│   │       ├── UserCard.tsx
│   │       └── DataTable.tsx
│   ├── pages/                  ← Route-based page components
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   └── users/
│   │       ├── UsersPage.tsx
│   │       └── UserDetailPage.tsx
│   ├── hooks/                  ← Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePagination.ts
│   │   └── useDebounce.ts
│   ├── services/               ← API calls
│   │   ├── api.ts              ← Axios instance
│   │   └── userService.ts
│   ├── store/                  ← State management (Zustand/Redux)
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── constants/
│   │   ├── index.ts
│   │   ├── routes.ts           ← Route path constants
│   │   └── queryKeys.ts        ← React Query key constants
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── cn.ts               ← clsx + tailwind-merge helper
│   └── App.tsx
```

## Next.js Structure

```
nextjs-app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   └── users/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/             ← Same structure (ui/layout/shared)
│   ├── lib/
│   │   ├── prisma.ts           ← Prisma client singleton
│   │   ├── auth.ts             ← NextAuth config
│   │   └── validations.ts      ← Zod schemas
│   ├── constants/
│   ├── types/
│   └── utils/
```

---

## Component vs Page — Rules

### A Page component should:
- Correspond to a route
- Fetch data (useEffect / React Query / server component)
- Compose the page layout
- Pass data down to components as props

### A Component should NOT:
- Make direct API calls (data comes via props or a dedicated hook)
- Handle page-level navigation (use callback props instead)
- Directly manipulate global state

```typescript
// ❌ WRONG — direct API call inside component
const UserCard = ({ userId }: { userId: string }) => {
  useEffect(() => {
    fetch(`/api/users/${userId}`).then(...) // component should not do this
  }, []);
}

// ✅ CORRECT — data passed as prop
const UserCard = ({ user }: { user: User }) => {
  return <div>{user.name}</div>
}

// ✅ CORRECT — custom hook (acceptable)
const UserCard = ({ userId }: { userId: string }) => {
  const { user, isLoading } = useUser(userId);
  if (isLoading) return <Skeleton />;
  return <div>{user?.name}</div>
}
```

---

## Route Constants (Required)

```typescript
// src/constants/routes.ts
export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
  },
  DASHBOARD: '/dashboard',
  USERS: {
    LIST: '/users',
    DETAIL: (id: string) => `/users/${id}`,
    EDIT: (id: string) => `/users/${id}/edit`,
  },
} as const;

// Usage — never use string literals
navigate(ROUTES.USERS.DETAIL(userId)); // ✅
navigate(`/users/${userId}`);          // ❌
```
