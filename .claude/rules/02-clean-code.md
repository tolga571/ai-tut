# 02 — Clean Code Standards

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Variable / function | camelCase | `getUserById` |
| Class / Interface / Type | PascalCase | `UserService`, `CreateUserDto` |
| Global constant | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| File (component) | PascalCase | `UserCard.tsx` |
| File (util/hook/service) | camelCase | `useAuth.ts`, `userService.ts` |
| CSS class | Tailwind utility only | `className="flex gap-4"` |
| Env variable | SCREAMING_SNAKE_CASE | `DATABASE_URL` |

---

## Static Data Management (Constants)

Static data is **never** defined inside a component or function.

```typescript
// ❌ WRONG — static data inside component
const MyComponent = () => {
  const roles = ['admin', 'editor', 'viewer'];
  const statusColors = { active: 'green', passive: 'red' };
}

// ✅ CORRECT — typed objects in constants/
// src/constants/roles.ts
export const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// src/constants/status.ts
export const STATUS_CONFIG = {
  active:  { label: 'Active',   color: 'text-green-600', bgColor: 'bg-green-100' },
  passive: { label: 'Inactive', color: 'text-red-600',   bgColor: 'bg-red-100'   },
} as const;

// src/constants/index.ts — central export
export * from './roles';
export * from './status';
export * from './api';
export * from './pagination';
```

---

## Function Rules

```typescript
// Max 20 lines (ideal: under 10)
// Must do one thing
// Max 3 parameters — if more, use an object

// ❌ WRONG
function createUser(name: string, email: string, password: string, role: string, age: number) {}

// ✅ CORRECT
interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  age: number;
}
function createUser(dto: CreateUserDto) {}

// Always use async/await, never callbacks
const getUser = async (id: string): Promise<User> => {
  try {
    const user = await UserRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  } catch (error) {
    throw error;
  }
};
```

---

## Import Order

```typescript
// 1. Node.js built-in modules
import path from 'path';
import fs from 'fs';

// 2. Third-party libraries
import express from 'express';
import mongoose from 'mongoose';

// 3. Internal modules (with alias)
import { UserService } from '@/services/userService';
import { authMiddleware } from '@/middleware/auth';

// 4. Types
import type { Request, Response } from 'express';
import type { CreateUserDto } from '@/types';
```

---

## Comment Rules

```typescript
// ❌ WRONG — comments that describe what the code does (code should be self-explanatory)
// finding user by id
const user = await UserRepository.findById(id);

// ✅ CORRECT — comments that explain WHY
// Skipping cache to prevent rate limiting bypass
const user = await UserRepository.findByIdFromDB(id);

// ✅ CORRECT — JSDoc for public API documentation
/**
 * Retrieves a user by ID.
 * @param id - MongoDB ObjectId or UUID
 * @throws {NotFoundError} if user does not exist
 */
async findById(id: string): Promise<User>
```

---

## File Size Limits

| File type | Max lines |
|-----------|-----------|
| Component | 150 |
| Service | 200 |
| Controller | 100 |
| Hook | 80 |
| Utility function | 50 |

If a file exceeds the limit → split / refactor.

---

## Environment Variables

```typescript
// ❌ WRONG
const dbUrl = 'mongodb://localhost:27017/mydb';
const secret = 'mysecret123';

// ✅ CORRECT — validated config module
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).default('5000'),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
});

export const env = envSchema.parse(process.env);
```

---

## Logging

```typescript
// console.log is FORBIDDEN in production — use a logger
// ✅ CORRECT — Winston or Pino
import logger from '@/utils/logger';

logger.info('User created', { userId: user.id });
logger.error('Database error', { error: err.message, stack: err.stack });
logger.warn('Rate limit approaching', { ip, count });

// Temporary debug in development only:
if (process.env.NODE_ENV === 'development') {
  console.log(data); // TODO: remove
}
```
