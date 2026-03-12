# Workflow 01 — New Project Setup

## Step 1 — Determine Project Type

```
What type of project?
├── API only (Express/Fastify)       → Step 2A
├── MERN Stack (Express + React)     → Step 2B
├── Next.js Full-stack               → Step 2C
└── Adding module to existing project → workflows/02-feature-development.md
```

## Step 2A — Express API Setup

```bash
mkdir project-name && cd project-name
npm init -y

npm install express mongoose dotenv bcryptjs jsonwebtoken zod \
  helmet cors express-rate-limit express-mongo-sanitize \
  cookie-parser winston

npm install -D typescript @types/express @types/node @types/bcryptjs \
  @types/jsonwebtoken @types/cors @types/cookie-parser \
  ts-node-dev tsx nodemon eslint prettier

npx tsc --init
```

## Step 2B — MERN Stack

```bash
# Backend
mkdir backend && cd backend
# → apply Step 2A

# Frontend
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
npm install axios react-router-dom @tanstack/react-query zustand zod \
  react-hook-form @hookform/resolvers clsx tailwind-merge react-hot-toast
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Step 2C — Next.js

```bash
npx create-next-app@latest project-name \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd project-name
npm install zod @tanstack/react-query zustand react-hook-form \
  @hookform/resolvers clsx tailwind-merge bcryptjs jsonwebtoken react-hot-toast
```

---

## Step 3 — Create Folder Structure

```bash
# Backend
mkdir -p src/{config,constants,modules,middleware,utils,types}

# Frontend
mkdir -p src/{components/{ui,layout,shared},pages,hooks,services,store,constants,types,utils}
```

---

## Step 4 — Create Base Files

### `.env.example` (Required)
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dbname
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-minimum-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
```

### `src/config/env.ts`
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV:              z.enum(['development', 'production', 'test']).default('development'),
  PORT:                  z.string().transform(Number).default('5000'),
  MONGODB_URI:           z.string().optional(),
  DATABASE_URL:          z.string().optional(),
  JWT_SECRET:            z.string().min(32),
  JWT_REFRESH_SECRET:    z.string().min(32),
  JWT_EXPIRES_IN:        z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS:         z.string().transform(Number).default('12'),
  CORS_ORIGIN:           z.string().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
```

### `src/utils/ApiResponse.ts`
```typescript
interface PaginationMeta {
  page: number; limit: number; total: number;
  totalPages: number; hasNext: boolean; hasPrev: boolean;
}

export class ApiResponse<T = null> {
  constructor(
    public success: boolean,
    public message: string,
    public data: T | null = null,
    public pagination?: PaginationMeta
  ) {}

  static ok<T>(data: T, message = 'Success')      { return new ApiResponse(true, message, data); }
  static created<T>(data: T, message = 'Created') { return new ApiResponse(true, message, data); }
  static error(message: string)                   { return new ApiResponse(false, message, null); }
}
```

### `src/utils/catchAsync.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
export const catchAsync = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
```

### `src/middleware/errorHandler.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import { ZodError } from 'zod';
import logger from '@/config/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
  }
  logger.error('Unexpected error', { error: err.message, stack: err.stack });
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};
```

---

## Step 5 — Add Security Middlewares

```typescript
// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { globalLimiter } from '@/middleware/rateLimiter';
import { errorHandler } from '@/middleware/errorHandler';
import { env } from '@/config/env';

const app = express();

// Security — FIRST
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(globalLimiter);
app.use(mongoSanitize());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/v1', routes);

// Error handling — LAST
app.use(errorHandler);

export default app;
```

---

## Step 6 — Git & Linting

```bash
git init
echo "node_modules/\n.env\n.env.*\n!.env.example\ndist/\nbuild/" > .gitignore
npx eslint --init
echo '{"semi":true,"singleQuote":true,"tabWidth":2,"trailingComma":"es5"}' > .prettierrc
git add . && git commit -m "feat: initial project setup"
```

---

## Step 7 — Project Start Checklist

- [ ] .env.example created?
- [ ] .env added to .gitignore?
- [ ] Security middlewares installed? (helmet, cors, rateLimit, mongoSanitize)
- [ ] Global error handler added?
- [ ] TypeScript strict mode enabled?
- [ ] ESLint + Prettier configured?
- [ ] Base folder structure created?
- [ ] ApiResponse utility created?
- [ ] catchAsync utility created?
- [ ] Auth guard set up? (see rules/06-ux-completeness.md)
- [ ] State management decided? (see rules/07-state-management.md)
