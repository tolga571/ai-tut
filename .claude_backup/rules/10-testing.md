# 10 — Testing Strategy

## Core Rule

> Every project must have tests for critical paths.
> "It works on my machine" is not a verification strategy.
> Tests are the safety net that lets you add features without breaking existing ones.

---

## What to Test — Priority Tiers

```
TIER 1 — Always test (non-negotiable):
- Authentication (login, logout, token refresh, authorization)
- Payment flows
- Critical business logic (order creation, stock decrement, permission checks)
- All API endpoints (happy path + error cases)

TIER 2 — Test when time allows:
- Custom hooks with complex logic
- Utility functions used in multiple places
- Form validation schemas (Zod)

TIER 3 — Skip unless critical:
- Static UI components (button colors, layouts)
- Simple passthrough functions
- Config files
```

---

## Stack

```bash
# Backend
npm install -D jest @types/jest ts-jest supertest @types/supertest

# Frontend
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom

# Both
npm install -D faker # test data generation
```

---

## Backend — API Endpoint Tests (Supertest)

```typescript
// src/modules/auth/__tests__/auth.test.ts
import request from 'supertest';
import createApp from '@/app';
import { connectTestDB, clearTestDB, closeTestDB } from '@/test/helpers/db';

const app = createApp();

beforeAll(async () => { await connectTestDB(); });
afterEach(async () => { await clearTestDB(); });
afterAll(async () => { await closeTestDB(); });

describe('POST /api/v1/auth/register', () => {
  it('should register a new user and return tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test User', email: 'test@test.com', password: 'Password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('test@test.com');
    expect(res.body.data.user.password).toBeUndefined(); // never expose password
  });

  it('should return 409 if email already exists', async () => {
    await request(app).post('/api/v1/auth/register')
      .send({ name: 'Test User', email: 'test@test.com', password: 'Password123' });

    const res = await request(app).post('/api/v1/auth/register')
      .send({ name: 'Test User 2', email: 'test@test.com', password: 'Password123' });

    expect(res.status).toBe(409);
  });

  it('should return 400 for invalid email', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'Password123' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('email');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('should login with correct credentials', async () => {
    await request(app).post('/api/v1/auth/register')
      .send({ name: 'Test User', email: 'test@test.com', password: 'Password123' });

    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'WrongPassword1' });

    expect(res.status).toBe(401);
  });
});
```

---

## Backend — Service Unit Tests (Jest)

```typescript
// src/modules/user/__tests__/user.service.test.ts
import { UserService } from '../user.service';
import { userRepository } from '../user.repository';
import { ConflictError, NotFoundError } from '@/utils/errors';

// Mock the repository
jest.mock('../user.repository');
const mockedRepo = jest.mocked(userRepository);

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      mockedRepo.findByEmail.mockResolvedValue(null);
      mockedRepo.create.mockResolvedValue({ _id: '123', name: 'Test', email: 'test@test.com' } as any);

      const result = await userService.createUser({
        name: 'Test', email: 'test@test.com', password: 'Password123', role: 'viewer'
      });

      expect(mockedRepo.findByEmail).toHaveBeenCalledWith('test@test.com');
      expect(mockedRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictError if email exists', async () => {
      mockedRepo.findByEmail.mockResolvedValue({ email: 'test@test.com' } as any);

      await expect(
        userService.createUser({ name: 'Test', email: 'test@test.com', password: 'Password123', role: 'viewer' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getUserById', () => {
    it('should throw NotFoundError if user does not exist', async () => {
      mockedRepo.findById.mockResolvedValue(null);
      await expect(userService.getUserById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
```

---

## Backend — Test Helpers

```typescript
// src/test/helpers/db.ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

export const connectTestDB = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

export const closeTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

// src/test/helpers/auth.ts — generate test tokens
export const getAuthToken = async (app: Express, role = 'viewer') => {
  const res = await request(app).post('/api/v1/auth/register').send({
    name: 'Test User', email: `test-${Date.now()}@test.com`,
    password: 'Password123', role,
  });
  return res.body.data.accessToken;
};
```

---

## Frontend — Component Tests (Vitest + Testing Library)

```typescript
// src/components/ui/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with correct label', () => {
    render(<Button onClick={() => {}}>Save</Button>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<Button onClick={() => {}} isLoading>Save</Button>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('prevents double click when loading', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} isLoading>Save</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

```typescript
// src/hooks/__tests__/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/store/authStore';

describe('useAuthStore', () => {
  beforeEach(() => useAuthStore.setState({ user: null, isAuthenticated: false }));

  it('should set auth on login', () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => { result.current.setAuth({ id: '1', name: 'Test' } as any, 'token123'); });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Test');
  });

  it('should clear state on logout', () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => { result.current.setAuth({ id: '1' } as any, 'token'); });
    act(() => { result.current.logout(); });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

---

## Zod Schema Tests

```typescript
// src/modules/user/__tests__/user.validation.test.ts
import { createUserSchema } from '../user.validation';

describe('createUserSchema', () => {
  it('should pass with valid data', () => {
    const result = createUserSchema.safeParse({
      body: { name: 'Test User', email: 'test@test.com', password: 'Password123', role: 'viewer' }
    });
    expect(result.success).toBe(true);
  });

  it('should fail with weak password', () => {
    const result = createUserSchema.safeParse({
      body: { name: 'Test', email: 'test@test.com', password: 'weak' }
    });
    expect(result.success).toBe(false);
  });

  it('should fail with invalid email', () => {
    const result = createUserSchema.safeParse({
      body: { name: 'Test', email: 'not-email', password: 'Password123' }
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].path).toContain('email');
  });
});
```

---

## Test Configuration

```typescript
// jest.config.ts (backend)
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: { '@/(.*)': '<rootDir>/src/$1' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/test/**'],
  coverageThreshold: { global: { branches: 60, functions: 70, lines: 70 } },
};

// vitest.config.ts (frontend)
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});

// src/test/setup.ts (frontend)
import '@testing-library/jest-dom';
```

---

## package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --forceExit"
  }
}
```

---

## Testing Checklist (Per Feature)

- [ ] Happy path tested?
- [ ] Auth/unauthorized case tested?
- [ ] Validation errors tested?
- [ ] Not found case tested?
- [ ] Conflict/duplicate case tested?
- [ ] Password never exposed in response?
- [ ] Tests pass before merging?
